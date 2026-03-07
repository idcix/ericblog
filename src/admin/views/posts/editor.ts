import type { BlogCategory, BlogPost, BlogTag } from "@/db/schema";
import { getAllowedMediaAcceptValue } from "@/lib/media";
import {
	escapeAttribute,
	escapeHtml,
	escapeTextarea,
	getPostStatusLabel,
	normalizeDisplayStatus,
} from "@/lib/security";
import { adminLayout } from "../layout";

interface EditorData {
	post?: BlogPost;
	categories: BlogCategory[];
	tags: BlogTag[];
	currentUsername: string;
	selectedTagIds?: number[];
	csrfToken: string;
	error?: string;
}

export function postEditorPage(data: EditorData): string {
	const {
		post,
		categories,
		tags,
		currentUsername,
		selectedTagIds = [],
		csrfToken,
		error,
	} = data;
	const isEdit = !!post;
	const formAction = isEdit
		? `/api/admin/posts/${post.id}`
		: "/api/admin/posts";
	const currentStatus = normalizeDisplayStatus(post?.status || "draft");
	const featuredImageKey = post?.featuredImageKey || "";
	const featuredImageAlt = post?.featuredImageAlt || "";
	const featuredImageUrl = featuredImageKey ? `/media/${featuredImageKey}` : "";

	const content = `
		<h1>${isEdit ? "编辑文章" : "新建文章"}</h1>
		${error ? `<div class="alert alert-error">${escapeHtml(error)}</div>` : ""}

		<form method="post" action="${escapeAttribute(formAction)}">
			<input type="hidden" name="_csrf" value="${escapeAttribute(csrfToken)}" />
			<div class="editor-grid">
				<div class="editor-panel">
					<div class="form-group">
						<label for="title">标题</label>
						<input type="text" id="title" name="title" class="form-input" value="${escapeAttribute(post?.title || "")}" required maxlength="200" />
					</div>

					<div class="form-group">
						<label for="slug">访问路径（可选）</label>
						<input
							type="text"
							id="slug"
							name="slug"
							class="form-input"
							value="${escapeAttribute(post?.slug || "")}"
							pattern="[a-z0-9\\-]*"
							maxlength="120"
							placeholder="留空时自动根据标题生成"
							data-manual="${isEdit ? "true" : "false"}"
						/>
						<p class="form-help">
							访问路径：/blog/<span data-slug-preview>${escapeHtml(post?.slug || "自动生成")}</span>
						</p>
					</div>

					<div class="form-group">
						<label for="excerpt">摘要</label>
						<input type="text" id="excerpt" name="excerpt" class="form-input" value="${escapeAttribute(post?.excerpt || "")}" maxlength="200" />
					</div>

					<div class="form-group">
						<label for="content">正文（Markdown）</label>
						<textarea id="content" name="content" class="form-textarea" required>${escapeTextarea(post?.content || "")}</textarea>
					</div>
				</div>

				<div class="editor-panel">
					<div class="form-group">
						<label for="status">状态</label>
						<select id="status" name="status" class="form-select">
							<option value="draft" ${currentStatus === "draft" ? "selected" : ""}>${getPostStatusLabel("draft")}</option>
							<option value="published" ${currentStatus === "published" ? "selected" : ""}>${getPostStatusLabel("published")}</option>
							<option value="scheduled" ${currentStatus === "scheduled" ? "selected" : ""}>${getPostStatusLabel("scheduled")}</option>
						</select>
					</div>

					<div class="form-group">
						<label for="categoryId">分类</label>
						<select id="categoryId" name="categoryId" class="form-select">
							<option value="">未分类</option>
							${categories.map((cat) => `<option value="${cat.id}" ${post?.categoryId === cat.id ? "selected" : ""}>${escapeHtml(cat.name)}</option>`).join("")}
						</select>
						<input
							type="text"
							id="newCategoryName"
							name="newCategoryName"
							class="form-input"
							maxlength="60"
							placeholder="输入新分类名，保存时自动创建并使用"
						/>
						<p class="form-help">如果你填了新分类名，会优先使用新分类喵</p>
					</div>

					<div class="form-group">
						<label>发布作者</label>
						<div class="form-readonly">${escapeHtml(currentUsername)}</div>
						<p class="form-help">作者固定为当前登录账号，不需要手动填写喵</p>
					</div>

					<div class="form-group">
						<label for="featuredImageKey">封面图片</label>
						<input type="hidden" id="featuredImageKey" name="featuredImageKey" value="${escapeAttribute(featuredImageKey)}" maxlength="255" />
						<div
							class="cover-uploader"
							data-cover-uploader="true"
							data-upload-url="/api/admin/media/upload-async"
							data-csrf-token="${escapeAttribute(csrfToken)}"
						>
							<input
								type="file"
								class="sr-only"
								accept="${escapeAttribute(getAllowedMediaAcceptValue())}"
								data-cover-file-input="true"
							/>
							<div class="cover-dropzone" data-cover-dropzone="true">
								${
									featuredImageUrl
										? `<img src="${escapeAttribute(featuredImageUrl)}" alt="${escapeAttribute(featuredImageAlt || "封面预览")}" class="cover-preview-image" data-cover-preview-image="true" />`
										: `<div class="cover-empty" data-cover-empty="true">拖拽图片到这里，或点击按钮上传喵</div>`
								}
							</div>
							<div class="cover-actions">
								<button type="button" class="btn btn-sm" data-cover-select="true">上传封面</button>
								<button type="button" class="btn btn-sm btn-danger" data-cover-clear="true">清空封面</button>
							</div>
							<p class="form-help">当前键名：<span data-cover-key-display>${escapeHtml(featuredImageKey || "未设置")}</span></p>
							<p class="form-help" data-cover-upload-status>支持 JPG、PNG、WEBP、AVIF、GIF，单图不超过 5MB 喵</p>
						</div>
					</div>

					<div class="form-group">
						<label for="featuredImageAlt">封面替代文本</label>
						<input type="text" id="featuredImageAlt" name="featuredImageAlt" class="form-input" value="${escapeAttribute(featuredImageAlt)}" maxlength="200" placeholder="可选，建议描述封面内容用于可访问性" />
					</div>

					<details>
						<summary>SEO 设置</summary>
						<div class="form-group">
							<label for="metaTitle">SEO 标题</label>
							<input type="text" id="metaTitle" name="metaTitle" class="form-input" value="${escapeAttribute(post?.metaTitle || "")}" maxlength="200" />
						</div>
						<div class="form-group">
							<label for="metaDescription">SEO 描述</label>
							<input type="text" id="metaDescription" name="metaDescription" class="form-input" value="${escapeAttribute(post?.metaDescription || "")}" maxlength="160" />
						</div>
						<div class="form-group">
							<label for="metaKeywords">SEO 关键词</label>
							<input type="text" id="metaKeywords" name="metaKeywords" class="form-input" value="${escapeAttribute(post?.metaKeywords || "")}" maxlength="200" />
						</div>
						<div class="form-group">
							<label for="canonicalUrl">规范链接地址</label>
							<input type="url" id="canonicalUrl" name="canonicalUrl" class="form-input" value="${escapeAttribute(post?.canonicalUrl || "")}" maxlength="255" />
						</div>
					</details>

					<div class="form-group">
						<label>标签</label>
						<input type="hidden" id="tagIds" name="tagIds" value="${escapeAttribute(selectedTagIds.join(","))}" />
						<div class="tag-list">
							${
								tags.length > 0
									? tags
											.map(
												(tag) => `
								<label class="tag-chip">
									<input type="checkbox" value="${tag.id}" ${selectedTagIds.includes(tag.id) ? "checked" : ""} data-tag-checkbox="true" />
									${escapeHtml(tag.name)}
								</label>`,
											)
											.join("")
									: `<span class="form-help">当前还没有可选标签，直接在下面输入新标签即可喵</span>`
							}
						</div>
						<input
							type="text"
							id="newTagNames"
							name="newTagNames"
							class="form-input"
							maxlength="400"
							placeholder="输入新标签，多个用逗号分隔，例如 Astro, Cloudflare"
						/>
						<p class="form-help">新标签会在保存时自动创建并自动勾选喵</p>
					</div>

					<div class="form-actions">
						<button type="submit" class="btn btn-primary">${isEdit ? "保存修改" : "创建文章"}</button>
						<a href="/api/admin/posts" class="btn">取消</a>
					</div>
				</div>
			</div>
		</form>

	`;

	return adminLayout(isEdit ? "编辑文章" : "新建文章", content, {
		csrfToken,
	});
}
