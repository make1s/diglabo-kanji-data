/** 開発リポを参照せず、実際のtarballをインストールして公開境界を検証する。 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { gzipSync } from "node:zlib";
import { build } from "esbuild";
const root = fileURLToPath(new URL("../", import.meta.url));
const out = resolve(root, "artifacts");
mkdirSync(out, { recursive: true });
interface Packed { filename: string; size: number; unpackedSize: number; integrity: string; files: { path: string }[] }
const packs = ["kanji", "data"].map((name) => {
  const result = JSON.parse(execFileSync("npm", ["pack", "--ignore-scripts", "--json", "--pack-destination", out], { cwd: resolve(root, `packages/${name}`), encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) as Packed[];
  const pack = result[0]!;
  assert(pack.files.some((f) => f.path === "LICENSE"));
  assert(pack.files.some((f) => f.path === "README.md"));
  assert(pack.files.every((f) => f.path === "package.json" || f.path === "LICENSE" || f.path === "README.md" || f.path === "ATTRIBUTION.md" || /^dist\/.*\.(?:js|ts|json)$/u.test(f.path)), "開発用ファイルが混入しています");
  const pkg = JSON.parse(readFileSync(resolve(root, `packages/${name}/package.json`), "utf8")) as { dependencies?: unknown; peerDependencies?: unknown };
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.peerDependencies, undefined);
  return pack;
});
assert.equal(packs[1]!.files.filter((f) => /^dist\/chars\/[^/]+\.js$/u.test(f.path)).length, 2313);
assert(packs[1]!.files.some((f) => f.path === "ATTRIBUTION.md"));
const temp = mkdtempSync(resolve(tmpdir(), "diglabo-kanji-consumer-"));
try {
  for (const [i, source] of [
    'import { renderCharacter, type Glyph } from "@diglabo/kanji"; console.log(typeof renderCharacter); const value: Glyph | undefined = undefined; void value;',
    'import glyph from "@diglabo/kanji-data/chars/04f11"; import type { Glyph } from "@diglabo/kanji-data"; const value: Glyph = glyph; console.log(value.record.char);',
  ].entries()) {
    const independent = mkdtempSync(resolve(tmpdir(), "diglabo-kanji-independent-"));
    try {
      writeFileSync(resolve(independent, "package.json"), '{"private":true,"type":"module"}\n');
      execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", resolve(out, packs[i]!.filename)], { cwd: independent, stdio: "pipe" });
      writeFileSync(resolve(independent, "consumer.ts"), source);
      writeFileSync(resolve(independent, "tsconfig.json"), JSON.stringify({ compilerOptions: { module: "NodeNext", moduleResolution: "NodeNext", target: "ES2022", strict: true, types: [] }, files: ["consumer.ts"] }));
      execFileSync(process.execPath, [createRequire(import.meta.url).resolve("typescript/bin/tsc"), "-p", "."], { cwd: independent, stdio: "inherit" });
      execFileSync(process.execPath, ["consumer.js"], { cwd: independent, stdio: "pipe" });
    } finally { rmSync(independent, { recursive: true, force: true }); }
  }
  writeFileSync(resolve(temp, "package.json"), '{"private":true,"type":"module"}\n');
  execFileSync("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--package-lock=false", ...packs.map((p) => resolve(out, p.filename))], { cwd: temp, stdio: "pipe" });
  const consumer = `import assert from "node:assert/strict";
import { readFileSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import manifest from "@diglabo/kanji-data";
import index from "@diglabo/kanji-data/index";
import kyu from "@diglabo/kanji-data/chars/04f11";
import { renderCharacter, listParts, filterCharacters } from "@diglabo/kanji";
assert(realpathSync(fileURLToPath(import.meta.resolve("@diglabo/kanji"))).startsWith(process.cwd()));
assert.equal(filterCharacters(index, {grade:2}).length, 160);
assert(listParts(kyu).some(p => p.element === "木"));
for (const item of index.chars) {
 const { default: glyph } = await import("@diglabo/kanji-data/chars/" + item.codepoint);
 const raw = JSON.parse(readFileSync(resolve(process.argv[2], "chars/" + item.codepoint + ".json"), "utf8"));
 assert.deepEqual(glyph.record, raw);
 assert.equal(glyph.manifest.datasetVersion, manifest.datasetVersion);
 assert.equal((renderCharacter(glyph).svg.match(/<path /g) || []).length, raw.strokeCount);
}
console.log(JSON.stringify({node:process.version, chars:index.chars.length, datasetVersion:manifest.datasetVersion}));`;
  writeFileSync(resolve(temp, "consumer.mjs"), consumer);
  const results: unknown[] = [JSON.parse(execFileSync(process.execPath, ["consumer.mjs", resolve(root, "dist")], { cwd: temp, encoding: "utf8" }))];
  if (process.argv.includes("--node24")) results.push(JSON.parse(execFileSync("npx", ["--yes", "--package=node@24", "node", "consumer.mjs", resolve(root, "dist")], { cwd: temp, encoding: "utf8", timeout: 180000 })));
  const typed = `import glyph from "@diglabo/kanji-data/chars/04f11";
import manifest, { type Glyph as DataGlyph } from "@diglabo/kanji-data";
import {renderCharacter, type Glyph} from "@diglabo/kanji";
const compatible: Glyph = glyph;
const independent: DataGlyph = compatible;
renderCharacter(independent, { visibleStrokes: 3 });
console.log(manifest.schemaVersion);
// @ts-expect-error 公開データは読み取り専用
glyph.record.strokes.push(glyph.record.strokes[0]);
`;
  writeFileSync(resolve(temp, "consumer.ts"), typed);
  for (const [module, moduleResolution] of [["NodeNext", "NodeNext"], ["ESNext", "Bundler"]]) {
    writeFileSync(resolve(temp, "tsconfig.json"), JSON.stringify({ compilerOptions: { target: "ES2022", module, moduleResolution, strict: true, noEmit: true, types: [] }, files: ["consumer.ts"] }));
    execFileSync(process.execPath, [createRequire(import.meta.url).resolve("typescript/bin/tsc"), "-p", resolve(temp, "tsconfig.json")], { cwd: temp, stdio: "inherit" });
  }
  const minimal = 'import kyu from "@diglabo/kanji-data/chars/04f11"; import {renderCharacter} from "@diglabo/kanji"; document.body.innerHTML=renderCharacter(kyu).svg;';
  writeFileSync(resolve(temp, "minimal.js"), minimal);
  const built = await build({ absWorkingDir: temp, entryPoints: ["minimal.js"], bundle: true, format: "esm", platform: "browser", target: "es2022", minify: true, write: false, metafile: true });
  const inputs = Object.keys(built.metafile!.inputs);
  const charInputs = inputs.filter((name) => /kanji-data\/dist\/chars\//u.test(name));
  assert.equal(charInputs.length, 1);
  assert(charInputs[0]!.endsWith("04f11.js"));
  assert(!inputs.some((name) => name.endsWith("kanji-data/dist/index.js") || /\.(woff2|otf)$/u.test(name)));
  const bytes = built.outputFiles![0]!.contents;
  const gzipBytes = gzipSync(bytes).byteLength;
  assert(gzipBytes < 48 * 1024, "一文字のビルドに過剰なデータが混入しています");
  copyFileSync(resolve(root, "examples/node/lesson.mjs"), resolve(temp, "lesson.mjs"));
  execFileSync(process.execPath, ["lesson.mjs", resolve(out, "node/lesson.html")], { cwd: temp, stdio: "pipe" });
  const report = { consumers: results, independentPackages: ["renderer", "data"], typeResolution: ["NodeNext", "Bundler"], singleCharacterBundle: { bytes: bytes.byteLength, gzipBytes, characterModules: charInputs.length }, packages: packs.map(({ filename, size, unpackedSize, integrity }) => ({ filename, size, unpackedSize, integrity })) };
  writeFileSync(resolve(out, "check-report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
} finally {
  rmSync(temp, { recursive: true, force: true });
}
