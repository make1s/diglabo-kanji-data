/** 既存distを変更せず、二つの公開用パッケージを作る。 */
import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import type { CharRecord, DatasetIndex } from "../src/build/types.js";
import type { CharacterRecord, DatasetManifest, Glyph } from "../packages/kanji/src/types.js";
import { renderCharacter } from "../packages/kanji/src/index.js";

type ReadonlyDeep<T> = T extends object ? { readonly [K in keyof T]: ReadonlyDeep<T[K]> } : T;
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
const sameContract: Same<ReadonlyDeep<CharRecord>, CharacterRecord> = true;
void sameContract;

const root = fileURLToPath(new URL("../", import.meta.url));
const file = (path: string): string => resolve(root, path);
const read = (path: string): string => readFileSync(file(path), "utf8");
const index = JSON.parse(read("dist/index.json")) as DatasetIndex;
const pkg = JSON.parse(read("package.json")) as { version: string };
const dataPkg = JSON.parse(read("packages/data/package.json")) as { version: string };
const rendererPkg = JSON.parse(read("packages/kanji/package.json")) as { version: string };
if (pkg.version !== index.version || dataPkg.version.split("-pkg.")[0] !== index.version) throw new Error("データ・生成用ルート・梱包版が一致しません");
const manifest: DatasetManifest = {
  schemaVersion: 1, datasetVersion: index.version, profilesVersion: index.profilesVersion, license: index.license,
  sources: [
    { name: "KanjiVG / Ulrich Apel", url: index.sources.kanjivg.url, license: index.sources.kanjivg.license, version: index.sources.kanjivg.release },
    { name: "KANJIDIC2 © EDRDG", url: "https://www.edrdg.org/wiki/index.php/KANJIDIC_Project", license: index.sources.kanjidic2.license, version: `${index.sources.kanjidic2.databaseVersion} / ${index.sources.kanjidic2.dateOfCreation}` },
    { name: "文部科学省 音訓割り振り表", url: index.sources.mext.url, license: "政府標準利用規約（CC BY 4.0互換）", version: index.sources.mext.title },
  ],
};
rmSync(file("packages/kanji/dist"), { recursive: true, force: true });
execFileSync(process.execPath, [createRequire(import.meta.url).resolve("typescript/bin/tsc"), "-p", file("packages/kanji/tsconfig.json")], { stdio: "inherit" });
const dataDist = file("packages/data/dist");
rmSync(dataDist, { recursive: true, force: true });
mkdirSync(resolve(dataDist, "chars"), { recursive: true });
copyFileSync(file("packages/kanji/dist/types.d.ts"), resolve(dataDist, "types.d.ts"));
copyFileSync(file("packages/kanji/LICENSE"), file("packages/data/LICENSE-MIT"));
writeFileSync(file("packages/data/LICENSE"), read("LICENSE").trimEnd() + "\n");
copyFileSync(file("ATTRIBUTION.md"), file("packages/data/ATTRIBUTION.md"));
writeFileSync(resolve(dataDist, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(resolve(dataDist, "manifest.js"), `const manifest = ${JSON.stringify(manifest)};\nexport { manifest };\nexport default manifest;\n`);
writeFileSync(resolve(dataDist, "manifest.d.ts"), 'export type * from "./types.js";\nimport type { DatasetManifest } from "./types.js";\ndeclare const manifest: DatasetManifest;\nexport { manifest };\nexport default manifest;\n');
writeFileSync(resolve(dataDist, "index.js"), `import manifest from "./manifest.js";\nconst index = { manifest, chars: ${JSON.stringify(index.chars)} };\nexport { index };\nexport default index;\n`);
writeFileSync(resolve(dataDist, "index.d.ts"), 'import type { CharacterIndex } from "./types.js";\ndeclare const index: CharacterIndex;\nexport { index };\nexport default index;\n');
const expected = new Set(index.chars.map((c) => `${c.codepoint}.json`));
const actual = readdirSync(file("dist/chars")).filter((name) => name.endsWith(".json"));
if (expected.size !== actual.length || actual.some((name) => !expected.has(name))) throw new Error("索引と文字JSONが一致しません");
for (const item of index.chars) {
  const record = JSON.parse(read(`dist/chars/${item.codepoint}.json`)) as CharRecord;
  const glyph: Glyph = { record, manifest };
  renderCharacter(glyph); // 全収録字を公開APIのデータ契約で検証する。
  for (const key of ["char", "codepoint", "kind", "grade", "strokeCount"] as const) {
    if (item[key] !== record[key]) throw new Error(`索引と文字の属性が一致しません: ${item.codepoint}`);
  }
  writeFileSync(resolve(dataDist, `chars/${item.codepoint}.js`), `import manifest from "../manifest.js";\nconst glyph = { record: ${JSON.stringify(record)}, manifest };\nexport default glyph;\n`);
  writeFileSync(resolve(dataDist, `chars/${item.codepoint}.d.ts`), 'import type { Glyph } from "../types.js";\ndeclare const glyph: Glyph;\nexport default glyph;\n');
}
console.log(`公開用パッケージを生成: renderer ${rendererPkg.version} / data ${dataPkg.version} / ${index.chars.length}字（元のdistは維持）`);
