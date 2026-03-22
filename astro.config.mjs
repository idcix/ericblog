// @ts-check
import cloudflare from "@astrojs/cloudflare";
import { defineConfig } from "astro/config";

export default defineConfig({
	output: "server",
	prefetch: {
		prefetchAll: true,
		defaultStrategy: "viewport",
	},
	adapter: cloudflare({
		platformProxy: {
			enabled: true,
		},
	}),
	site: "https://ericblog.260.workers.dev",
	vite: {
		resolve: {
			alias: {
				"@": "/src",
			},
		},
	},
});
