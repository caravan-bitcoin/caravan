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

// ESM can use the same declarations as the base .d.ts
writeFileSync(dmtsPath, source, "utf8");

// CommonJS needs export = instead of export default
let cjsDecl = source;

// Convert class/interface/type/function declarations
cjsDecl = cjsDecl.replace(
  /export default ((?:class|interface|type|const|function)\s+\w+[\s\S]*?);/g,
  (match, declaration) => `${declaration.trim()}\nexport = ${declaration.match(/\w+/)[0]};`
);

// Catch remaining default exports
cjsDecl = cjsDecl.replace(
  /export default ([^;\n]+);/g,
  "declare const _default: typeof $1;\nexport = _default;"
);

writeFileSync(dctsPath, cjsDecl, "utf8");

console.log("✓ Emitted index.d.mts and index.d.cts");
