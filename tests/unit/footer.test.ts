import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("页脚精简保护喵", () => {
	test("页脚不再渲染重复的小导航链接喵", async () => {
		const footerSource = await readFile("src/components/Footer.astro", "utf8");

		assert.ok(!footerSource.includes('class="footer-links"'));
		assert.ok(!footerSource.includes('href="/blog"'));
		assert.ok(!footerSource.includes('href="/search"'));
		assert.ok(!footerSource.includes('href="/sitemap.xml"'));
		assert.match(footerSource, /footer-meta/u);
	});
});
