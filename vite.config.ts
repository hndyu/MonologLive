import { defineConfig } from "vite";

export default defineConfig({
	root: ".",
	build: {
		outDir: "dist",
		sourcemap: true,
		target: "es2020",
	},
	server: {
		port: 3000,
		open: true,
	},
	resolve: {
		alias: {
			"@": "/src",
		},
	},
});
