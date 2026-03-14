import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, test } from "node:test";

describe("首页灵动交互保护", () => {
	test("基础布局会加载首页交互脚本", async () => {
		const baseLayoutSource = await readFile("src/layouts/Base.astro", "utf8");

		assert.match(baseLayoutSource, /home-motion\.js/u);
		assert.match(baseLayoutSource, /site-shell-has-background-image/u);
	});

	test("首页会提供景深 Hero 和 3D 胶囊结构", async () => {
		const homePageSource = await readFile("src/pages/index.astro", "utf8");

		assert.match(homePageSource, /data-hero-depth/u);
		assert.match(homePageSource, /data-tilt-card/u);
		assert.match(homePageSource, /data-tilt-scale="0\.78"/u);
		assert.match(homePageSource, /data-tilt-shift-scale="1\.08"/u);
		assert.match(homePageSource, /hero-signal-card/u);
		assert.match(homePageSource, /hero-main-media/u);
		assert.match(homePageSource, /hero-aura-primary/u);
	});

	test("首页最近更新列表不再按置顶状态拆分查询", async () => {
		const homePageSource = await readFile("src/pages/index.astro", "utf8");

		assert.doesNotMatch(homePageSource, /pinnedPosts/u);
		assert.doesNotMatch(homePageSource, /eq\(blogPosts\.isPinned, true\)/u);
		assert.doesNotMatch(homePageSource, /eq\(blogPosts\.isPinned, false\)/u);
		assert.match(homePageSource, /recentSectionSubheading/u);
	});

	test("首页文案不再展示后台置顶配置提示", async () => {
		const homePageSource = await readFile("src/pages/index.astro", "utf8");

		assert.doesNotMatch(
			homePageSource,
			/可在后台编辑文章时勾选“首页置顶”，并用顺序值控制展示先后。/u,
		);
		assert.doesNotMatch(
			homePageSource,
			/置顶文章固定展示在上方，本区仅显示非置顶的最近发布内容。/u,
		);
	});

	test("右侧信息卡毛玻璃会跟随主题在深浅底之间切换", async () => {
		const homePageSource = await readFile("src/pages/index.astro", "utf8");

		assert.match(homePageSource, /hero-signal-pane-bg/u);
		assert.ok(
			homePageSource.includes(':global([data-theme="dark"]) .hero-signal-card'),
		);
		assert.ok(
			homePageSource.includes(':global(:root:not([data-theme="light"]))'),
		);
		assert.match(homePageSource, /hero-signal-pane-border/u);
	});

	test("首页交互脚本会在切页后重新初始化并驱动鼠标联动变量", async () => {
		const homeMotionSource = await readFile("public/home-motion.js", "utf8");

		assert.match(homeMotionSource, /astro:page-load/u);
		assert.match(homeMotionSource, /astro:before-swap/u);
		assert.match(homeMotionSource, /--hero-pointer-x/u);
		assert.match(homeMotionSource, /--tilt-rotate-x/u);
		assert.match(homeMotionSource, /pointermove/u);
	});

	test("首页首屏简介支持保留换行展示", async () => {
		const homePageSource = await readFile("src/pages/index.astro", "utf8");

		assert.match(homePageSource, /\.home-hero-copy \.page-intro/u);
		assert.match(homePageSource, /white-space:\s*pre-line/u);
	});
});
