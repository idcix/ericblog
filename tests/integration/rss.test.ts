import assert from "node:assert/strict";
import { register } from "node:module";
import { after, describe, test } from "node:test";
import { createContext } from "astro/middleware";
import { getPlatformProxy } from "wrangler";

// 使用隔离的本地 D1 执行真实查询，验证数量限制与公开状态过滤。
register(
	`data:text/javascript,${encodeURIComponent(`
	export function resolve(specifier, context, nextResolve) {
		return specifier === "cloudflare:workers"
			? { url: "data:text/javascript,export const env = {};", shortCircuit: true }
			: nextResolve(specifier, context);
	}
`)}`,
	import.meta.url,
);
const platform = await getPlatformProxy<Env>({
	configPath: "wrangler.jsonc",
	persist: false,
	remoteBindings: false,
});
after(() => platform.dispose());
const { GET } = await import("../../src/pages/rss.xml");
const { env } = await import("cloudflare:workers");
const d1 = platform.env.DB;
env.DB = d1;

await d1
	.prepare(`
	CREATE TABLE blog_posts (
		slug TEXT PRIMARY KEY,
		title TEXT NOT NULL,
		excerpt TEXT,
		content TEXT NOT NULL,
		status TEXT NOT NULL,
		publish_at TEXT,
		published_at TEXT,
		updated_at TEXT NOT NULL DEFAULT '2026-01-01 00:00:00'
	)
`)
	.run();

const insert = d1.prepare(
	"INSERT INTO blog_posts (slug, title, excerpt, content, status, publish_at, published_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
);
await d1.batch(
	Array.from({ length: 35 }, (_, index) =>
		insert.bind(
			`post-${index}`,
			`文章 ${index}`,
			null,
			`正文 ${index}`,
			"published",
			null,
			"2026-01-01 00:00:00",
		),
	),
);

const longContent = `${"这是一段超过摘要长度的正文。".repeat(30)}\n\n**完整结尾**\n\n\`\`\`ts\nconst value = "<item> & ]]>";\n  console.log(value);\n\`\`\`\n\n<script>alert("x")</script>`;
await insert
	.bind(
		"中文文章",
		'中文 <标题> & "引号"',
		"仅用于列表的摘要",
		longContent,
		"published",
		null,
		"2026-01-02 00:00:00",
	)
	.run();
for (const [slug, status, publishAt] of [
	["draft-post", "draft", null],
	["scheduled-future", "scheduled", "9999-01-01T00:00:00.000Z"],
	["scheduled-due", "scheduled", "2000-01-01T00:00:00.000Z"],
	["scheduled-without-date", "scheduled", null],
	["empty-post", "published", null],
] as const) {
	await insert.bind(slug, slug, null, "", status, publishAt, null).run();
}

function requestFeed() {
	return GET(
		createContext({
			request: new Request("https://blog.ericterminal.com/rss.xml"),
			defaultLocale: "zh-CN",
		}),
	);
}

describe("RSS 全文订阅", () => {
	test("输出超过 30 篇公开文章，并保留最新文章优先的顺序", async () => {
		const response = await requestFeed();
		assert.equal(response.status, 200);
		const xml = await response.text();
		const items = [...xml.matchAll(/<item>[\s\S]*?<\/item>/gu)];
		assert.equal(items.length, 38);
		for (let index = 0; index < 35; index++) {
			assert.ok(xml.includes(`<title>文章 ${index}</title>`));
		}
		assert.ok(
			items[0][0].includes(
				"<title>中文 &lt;标题&gt; &amp; &quot;引号&quot;</title>",
			),
		);
		assert.ok(
			items[0][0].includes(`/blog/${encodeURIComponent("中文文章")}</link>`),
		);
	});

	test("有摘要的长文章仍输出全文、段落与代码缩进，并安全转义 HTML 和 XML", async () => {
		const xml = await (await requestFeed()).text();
		assert.ok(xml.includes("这是一段超过摘要长度的正文。".repeat(30)));
		assert.ok(
			xml.includes("&lt;p&gt;&lt;strong&gt;完整结尾&lt;/strong&gt;&lt;/p&gt;"),
		);
		assert.ok(xml.includes("\n  console.log(value);\n"));
		assert.ok(xml.includes("&amp;lt;item&amp;gt; &amp;amp; ]]&amp;gt;"));
		assert.ok(xml.includes("&amp;lt;script&amp;gt;"));
		assert.ok(!xml.includes("<script>"));
		assert.ok(!xml.includes("仅用于列表的摘要"));
	});

	test("保留公开状态过滤，包含已到期定时文章与空正文文章", async () => {
		const xml = await (await requestFeed()).text();
		assert.ok(xml.includes("<title>scheduled-due</title>"));
		assert.ok(xml.includes("<title>empty-post</title>"));
		for (const slug of [
			"draft-post",
			"scheduled-future",
			"scheduled-without-date",
		]) {
			assert.ok(!xml.includes(slug), slug);
		}
	});

	test("响应禁止缓存，后续请求反映正文修改和文章撤回", async () => {
		await insert
			.bind(
				"edited-post",
				"更新测试",
				null,
				"原始正文",
				"published",
				null,
				null,
			)
			.run();
		try {
			const response = await requestFeed();
			assert.equal(response.headers.get("Cache-Control"), "no-store");
			assert.equal(
				response.headers.get("Content-Type"),
				"application/rss+xml; charset=utf-8",
			);
			assert.ok((await response.text()).includes("原始正文"));
			await d1
				.prepare("UPDATE blog_posts SET content = ? WHERE slug = ?")
				.bind("修改后的正文", "edited-post")
				.run();
			const updated = await (await requestFeed()).text();
			assert.ok(updated.includes("修改后的正文"));
			assert.ok(!updated.includes("原始正文"));
			await d1
				.prepare("UPDATE blog_posts SET status = 'draft' WHERE slug = ?")
				.bind("edited-post")
				.run();
			const withdrawn = await (await requestFeed()).text();
			assert.ok(!withdrawn.includes("edited-post"));
			assert.ok(!withdrawn.includes("修改后的正文"));
		} finally {
			await d1
				.prepare("DELETE FROM blog_posts WHERE slug = ?")
				.bind("edited-post")
				.run();
		}
	});
});
