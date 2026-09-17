import { env } from "cloudflare:workers";
import type { APIRoute } from "astro";
import { blogPosts } from "@/db/schema";
import { getDb } from "@/lib/db";
import { getPublicPostBySlugCondition } from "@/lib/public-content";
import { decodeRouteParam, sanitizeSlug } from "@/lib/security";

const headers = {
	"Content-Type": "text/plain; charset=utf-8",
	// 原文用于程序读取，避免内容修改或撤回后仍返回缓存版本。
	"Cache-Control": "no-store",
	"X-Content-Type-Options": "nosniff",
};

export const GET: APIRoute = async ({ params }) => {
	const slug = sanitizeSlug(decodeRouteParam(params.slug ?? ""));
	if (!slug) {
		return new Response("文章不存在", { status: 404, headers });
	}

	try {
		const [post] = await getDb(env.DB)
			.select({ content: blogPosts.content })
			.from(blogPosts)
			.where(getPublicPostBySlugCondition(slug))
			.limit(1);

		if (!post) {
			return new Response("文章不存在", { status: 404, headers });
		}

		// 保留数据库中的 Markdown 原文，不经过 HTML 渲染或附加页面信息。
		return new Response(post.content, { headers });
	} catch {
		return new Response("暂时无法读取文章", { status: 503, headers });
	}
};
