import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { desc } from "drizzle-orm";
import { blogPosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getPublicPostVisibilityCondition } from "@/lib/public-content";
import { encodeRouteParam, renderSafeMarkdown } from "@/lib/security";
import {
	DEFAULT_SITE_APPEARANCE,
	getSiteAppearance,
	resolveSiteDescriptionFromAppearance,
} from "@/lib/site-appearance";
import { siteConfig } from "@/lib/types";

interface FeedPost {
	title: string;
	slug: string;
	content: string;
	publishedAt: string | null;
	updatedAt: string;
}

function escapeXml(value: string): string {
	return value
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&apos;");
}

function toRssDate(value: string | null | undefined): string | null {
	if (!value) {
		return null;
	}

	const normalized = value.includes("T")
		? value
		: `${value.replace(" ", "T")}Z`;
	const parsed = new Date(normalized);

	if (Number.isNaN(parsed.getTime())) {
		return null;
	}

	return parsed.toUTCString();
}

export const GET: APIRoute = async () => {
	let posts: FeedPost[] = [];
	let feedDescription = siteConfig.description;

	try {
		const db = getDb(env.DB);

		const [postRows, appearance] = await Promise.all([
			db
				.select({
					title: blogPosts.title,
					slug: blogPosts.slug,
					content: blogPosts.content,
					publishedAt: blogPosts.publishedAt,
					updatedAt: blogPosts.updatedAt,
				})
				.from(blogPosts)
				.where(getPublicPostVisibilityCondition())
				.orderBy(desc(blogPosts.publishedAt), desc(blogPosts.updatedAt)),
			getSiteAppearance(db).catch(() => DEFAULT_SITE_APPEARANCE),
		]);
		posts = postRows;
		feedDescription = resolveSiteDescriptionFromAppearance(
			appearance,
			siteConfig.description,
		);
	} catch {
		// D1 未绑定时回退为空 Feed
	}

	const now = new Date().toUTCString();
	const items = await Promise.all(
		posts.map(async (post) => {
			const url = `${siteConfig.url}/blog/${encodeRouteParam(post.slug)}`;
			const pubDate =
				toRssDate(post.publishedAt) || toRssDate(post.updatedAt) || now;
			// RSS 的 description 支持 HTML，复用文章页的安全渲染以保留完整正文格式。
			const content = await renderSafeMarkdown(post.content);

			return `<item>
	<title>${escapeXml(post.title)}</title>
	<link>${url}</link>
	<guid isPermaLink="true">${url}</guid>
	<description>${escapeXml(content)}</description>
	<pubDate>${pubDate}</pubDate>
</item>`;
		}),
	);

	const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
	<title>${escapeXml(siteConfig.name)}</title>
	<link>${siteConfig.url}</link>
	<description>${escapeXml(feedDescription)}</description>
	<language>${siteConfig.language}</language>
	<atom:link href="${siteConfig.url}/rss.xml" rel="self" type="application/rss+xml" />
	<lastBuildDate>${now}</lastBuildDate>
	${items.join("\n")}
</channel>
</rss>`;

	return new Response(rss.trim(), {
		headers: {
			"Content-Type": "application/rss+xml; charset=utf-8",
			// 供外部阅读器同步全文，修改或撤回后不继续返回缓存内容。
			"Cache-Control": "no-store",
		},
	});
};
