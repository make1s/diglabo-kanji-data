/** ローカルの配布候補を用意する。外部公開・タグ操作・ライセンス変更は行わない。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { copyFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const file = (path: string): string => resolve(root, path);
const readJson = (path: string): Record<string, unknown> => JSON.parse(readFileSync(file(path), "utf8")) as Record<string, unknown>;
const data = readJson("dist/index.json");
const font = readJson("dist/fonts/manifest.json");
assert.equal(data.version, font.version);
assert.equal(font.sha256, createHash("sha256").update(readFileSync(file("dist/fonts/tehon.woff2"))).digest("hex"));
const renderer = readJson("packages/kanji/package.json");
const dataPkg = readJson("packages/data/package.json");
const stage = file("artifacts/release-staging");
const out = file("artifacts");
mkdirSync(out, { recursive: true });
rmSync(stage, { recursive: true, force: true });
mkdirSync(stage, { recursive: true });
const archives: string[] = [];
try {
  for (const kind of ["fonts", "data"]) {
    const dir = resolve(stage, kind);
    mkdirSync(dir, { recursive: true });
    for (const name of ["LICENSE", "ATTRIBUTION.md"]) copyFileSync(file(name), resolve(dir, name));
    if (kind === "fonts") {
      cpSync(file("dist/fonts"), resolve(dir, "fonts"), { recursive: true });
      writeFileSync(resolve(dir, "README.md"), '# DiglaboTehon\n\nWOFF2はWeb用、OTFはPCでの利用用です。CC BY-SA 4.0。再配布にはLICENSE・ATTRIBUTION.mdを同梱し、利用する画面や印刷物で出典を示してください。\n\n```css\n@font-face { font-family: DiglaboTehon; src: url("./fonts/tehon.woff2") format("woff2"); font-display: swap; }\n.tehon { font-family: DiglaboTehon, serif; }\n```\n');
    } else {
      cpSync(file("dist/chars"), resolve(dir, "chars"), { recursive: true });
      copyFileSync(file("dist/index.json"), resolve(dir, "index.json"));
      copyFileSync(file("packages/data/dist/manifest.json"), resolve(dir, "manifest.json"));
      writeFileSync(resolve(dir, "README.md"), '# 文字別JSON\n\n必要な文字のchars/{codepoint}.jsonとmanifest.jsonをサイトへ同梱します。描画には{ record, manifest }を渡してください。index.jsonは任意の索引です。CC BY-SA 4.0。LICENSEとATTRIBUTION.mdも同梱してください。\n');
    }
    const paths: string[] = [];
    const visit = (current: string, prefix = ""): void => {
      for (const name of readdirSync(current).sort()) {
        const path = resolve(current, name);
        const rel = prefix + name;
        if (statSync(path).isDirectory()) visit(path, `${rel}/`);
        else { utimesSync(path, new Date("2000-01-01T00:00:00Z"), new Date("2000-01-01T00:00:00Z")); paths.push(rel); }
      }
    };
    visit(dir);
    const name = `diglabo-kanji-${kind}-${String(data.version)}.zip`;
    rmSync(resolve(out, name), { force: true });
    execFileSync("zip", ["-X", "-q", resolve(out, name), "-@"], { cwd: dir, input: paths.join("\n") + "\n", env: { ...process.env, TZ: "UTC" } });
    archives.push(name);
  }
} finally { rmSync(stage, { recursive: true, force: true }); }
const tarballs = [`diglabo-kanji-${String(renderer.version)}.tgz`, `diglabo-kanji-data-${String(dataPkg.version)}.tgz`];
const files = [...tarballs, ...archives].map((name) => {
  const bytes = readFileSync(resolve(out, name));
  return { file: name, bytes: bytes.byteLength, sha256: createHash("sha256").update(bytes).digest("hex") };
});
const manifest = {
  status: "local-candidate", readyForPublication: false,
  sourceCommit: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  sourceDirty: execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0,
  rendererVersion: renderer.version, dataPackageVersion: dataPkg.version, datasetVersion: data.version, schemaVersion: 1,
  currentRendererLicense: renderer.license,
  publicationChecks: ["npm名・scopeと公開権限", "デモ公開先"],
  files,
};
writeFileSync(resolve(out, "release-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
writeFileSync(resolve(out, "SHA256SUMS"), files.map((f) => `${f.sha256}  ${f.file}`).join("\n") + "\n");
console.log(`配布候補を生成: ${files.length}ファイル / artifacts/release-manifest.json（外部公開前の確認事項あり）`);
