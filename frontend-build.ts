#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind";

console.log("🏗️  Building frontend...\n");

const result = await Bun.build({
  entrypoints: ["src/index.html"],
  outdir: "dist",
  plugins: [plugin],
  minify: true,
  target: "browser",
  sourcemap: "linked",
});

if (!result.success) {
  console.error("❌ Build failed");
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

console.log("✅ Build completed successfully\n");
console.log(`📦 Generated ${result.outputs.length} files`);
