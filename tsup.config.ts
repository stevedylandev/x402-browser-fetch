import { defineConfig } from "tsup";

export default defineConfig({
	entry: ["src/index.ts"],
	format: ["cjs", "esm"], // Build for commonJS and ESmodules
	dts: true, // Generate declaration file (.d.ts)
	splitting: true,
	sourcemap: true,
	clean: true,
	outDir: "dist",
	treeshake: true,
	outExtension({ format }) {
		return {
			js: format === "cjs" ? ".js" : ".mjs",
		};
	},
});
