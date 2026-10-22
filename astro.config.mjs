// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	// 升级编译器后继续保留行内元素之间的空格，避免正文排版发生变化。
	compressHTML: true,
	prefetch: {
		prefetchAll: true,
		defaultStrategy: "viewport",
	},
	adapter: cloudflare(),
	site: "https://blog.ericterminal.com",
	vite: {
		resolve: {
			alias: {
				"@": "/src",
			},
		},
	},
});
