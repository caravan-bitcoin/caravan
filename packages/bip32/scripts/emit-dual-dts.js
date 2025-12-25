import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

const distDir = join(process.cwd(), "dist");
const dtsPath = join(distDir, "index.d.ts");
const dmtsPath = join(distDir, "index.d.mts");
const dctsPath = join(distDir, "index.d.cts");

if (!existsSync(dtsPath)) {
  console.error("index.d.ts not found; skipping dual declaration emit");
  process.exit(1);
}

const source = readFileSync(dtsPath, "utf8");

// ESM declarations can mirror the base .d.ts
writeFileSync(dmtsPath, source, "utf8");

// Best-effort CJS declarations: keep shape, swap default export to export =
let cjsDecl = source;
// Handle `export default <identifier>` and `export default class/function` roughly
cjsDecl = cjsDecl.replace(/export default ([^;\n]+)/g, "declare const _default: $1\nexport = _default;");
writeFileSync(dctsPath, cjsDecl, "utf8");

console.log("✓ Emitted index.d.mts and index.d.cts");
