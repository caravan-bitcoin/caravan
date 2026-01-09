const { readFileSync, writeFileSync, existsSync } = require("fs");
const { join } = require("path");

const distDir = join(process.cwd(), "dist");
const dtsPath = join(distDir, "index.d.ts");
const dmtsPath = join(distDir, "index.d.mts");

if (!existsSync(dtsPath)) {
  console.error("index.d.ts not found; skipping .d.mts emit");
  process.exit(1);
}

const source = readFileSync(dtsPath, "utf8");
writeFileSync(dmtsPath, source, "utf8");

console.log("✓ Emitted index.d.mts");
