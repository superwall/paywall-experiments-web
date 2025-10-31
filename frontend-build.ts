#!/usr/bin/env bun
import plugin from "bun-plugin-tailwind";
import { readFileSync, writeFileSync, copyFileSync, existsSync } from "fs";

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

// Copy OG image if it exists
const ogImagePath = "src/og-image.png";
const ogImageDest = "dist/og-image.png";
if (existsSync(ogImagePath)) {
  copyFileSync(ogImagePath, ogImageDest);
  console.log("✅ Copied OG image to dist");
} else {
  console.log("⚠️  Warning: og-image.png not found in src folder");
}

// Copy OG result image if it exists
const ogResultImagePath = "src/og-result-image.png";
const ogResultImageDest = "dist/og-result-image.png";
if (existsSync(ogResultImagePath)) {
  copyFileSync(ogResultImagePath, ogResultImageDest);
  console.log("✅ Copied OG result image to dist");
} else {
  console.log("⚠️  Warning: og-result-image.png not found in src folder");
}

// Fix asset paths in index.html to use absolute paths instead of relative
// This prevents issues when serving from sub-routes like /r/slug
console.log("🔧 Fixing asset paths in index.html...");
try {
  const htmlPath = "dist/index.html";
  let html = readFileSync(htmlPath, "utf-8");
  
  // Replace relative paths (./file.js) with absolute paths (/file.js)
  html = html.replace(/href="\.\//g, 'href="/');
  html = html.replace(/src="\.\//g, 'src="/');
  
  writeFileSync(htmlPath, html, "utf-8");
  console.log("✅ Fixed asset paths to use absolute paths\n");
} catch (error) {
  console.error("⚠️  Warning: Could not fix asset paths:", error);
}
