import assert from "node:assert/strict";
import { register } from "node:module";
import { after, describe, test } from "node:test";
import type { APIContext } from "astro";
import { getPlatformProxy } from "wrangler";

// Node 测试进程使用本地 D1 绑定，保持生产路由和 Drizzle 查询原样执行。
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
const { GET } = await import("../../src/pages/blog/[slug].md");
const { env } = await import("cloudflare:workers");
const d1 = platform.env.DB;
env.DB = d1;

await d1
	.prepare(`
	CREATE TABLE blog_posts (
		slug TEXT PRIMARY KEY,
		content TEXT NOT NULL,
		status TEXT NOT NULL,
		publish_at TEXT,
		view_count INTEGER DEFAULT 0
	)
`)
	.run();

const content =
	"# 中文标题\n\n正文 **加粗**。\n\n```ts\nconst html = '<div>原文</div>';\n```\n\n![图片](/media/example.png)\n";
const insert = d1.prepare(
	"INSERT INTO blog_posts (slug, content, status, publish_at) VALUES (?, ?, ?, ?)",
);
for (const [slug, status, publishAt] of [
	["hello-world", "published", null],
	["中文文章", "published", null],
	["draft-post", "draft", null],
	["scheduled-future", "scheduled", "9999-01-01T00:00:00.000Z"],
	["scheduled-due", "scheduled", "2000-01-01T00:00:00.000Z"],
	["scheduled-without-date", "scheduled", null],
] as const) {
	await insert.bind(slug, content, status, publishAt).run();
}
await insert.bind("empty-post", "", "published", null).run();

async function requestMarkdown(slug?: string) {
	return GET({ params: { slug } } as unknown as APIContext);
}

describe("文章 Markdown 原文接口", () => {
	test("返回完整原文和纯文本响应头，且不增加浏览量", async () => {
		const response = await requestMarkdown("hello-world");

		assert.equal(response.status, 200);
		assert.equal(await response.text(), content);
		assert.equal(
			response.headers.get("Content-Type"),
			"text/plain; charset=utf-8",
		);
		assert.equal(response.headers.get("X-Content-Type-Options"), "nosniff");
		assert.equal(response.headers.get("Cache-Control"), "no-store");
		assert.equal(
			await d1
				.prepare("SELECT view_count FROM blog_posts WHERE slug = ?")
				.bind("hello-world")
				.first("view_count"),
			0,
		);
	});

	test("中文及 URL 编码路径均能读取同一篇文章", async () => {
		for (const slug of ["中文文章", encodeURIComponent("中文文章")]) {
			const response = await requestMarkdown(slug);
			assert.equal(response.status, 200);
			assert.equal(await response.text(), content);
		}
	});

	test("已到发布时间的定时文章可读取", async () => {
		const response = await requestMarkdown("scheduled-due");
		assert.equal(response.status, 200);
		assert.equal(await response.text(), content);
	});

	test("草稿、未到期、无发布时间、不存在及无效路径均返回纯文本 404", async () => {
		for (const slug of [
			"draft-post",
			"scheduled-future",
			"scheduled-without-date",
			"missing-post",
			"../hello-world",
			"%ZZ",
			undefined,
		]) {
			const response = await requestMarkdown(slug);
			assert.equal(response.status, 404, `文章路径：${String(slug)}`);
			assert.equal(await response.text(), "文章不存在");
			assert.equal(response.headers.get("Location"), null);
			assert.equal(response.headers.get("Cache-Control"), "no-store");
		}
	});

	test("空正文仍然是存在的文章", async () => {
		const response = await requestMarkdown("empty-post");
		assert.equal(response.status, 200);
		assert.equal(await response.text(), "");
	});

	test("数据库异常返回纯文本 503，不泄露内部错误", async () => {
		env.DB = {
			prepare() {
				throw new Error("内部数据库错误详情");
			},
		} as unknown as D1Database;
		try {
			const response = await requestMarkdown("hello-world");
			assert.equal(response.status, 503);
			assert.equal(await response.text(), "暂时无法读取文章");
			assert.equal(response.headers.get("Cache-Control"), "no-store");
		} finally {
			env.DB = d1;
		}
	});
});
