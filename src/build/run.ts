/**
 * 全量ビルド: input/ → dist/chars/{codepoint}.json + dist/index.json、build/report.json
 * 対象: 常用漢字 2,136 字（割り振り表の字。教育漢字は配当学年順、中学で習う字は codepoint 順で後ろ）、
 *       ひらがな U+3041..3096、カタカナ U+30A1..30FA と長音符 U+30FC
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseKanjidic2, readKanjidicHeader } from "../kanjidic/parse.js";
import { parseKanjiVg } from "../kanjivg/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { validateProfileTable } from "../profiles/types.js";
import type { ReadingOverride } from "../readings/edu.js";
import { buildChar } from "./char.js";
import type { RadicalNameTable, RadicalOverride } from "./radical.js";
import { KANJIDIC2_URL, KANJIVG_RELEASE, KANJIVG_URL } from "./sources.js";
import { buildTehonFont, tehonManifest, TEHON_FILE } from "../font/tehon.js";
import type { CharKind, CharRecord, DatasetIndex } from "./types.js";

const root = fileURLToPath(new URL("../../", import.meta.url));
const p = (rel: string): string => root + rel;
const hex = (cp: number): string => cp.toString(16).padStart(5, "0");

const pkg = JSON.parse(readFileSync(p("package.json"), "utf8")) as { version: string };
const table = validateProfileTable(JSON.parse(readFileSync(p("data/stroke-profiles.json"), "utf8")));
const radicalNames = JSON.parse(readFileSync(p("data/radical-names.json"), "utf8")) as RadicalNameTable;
const kanjidicXml = readFileSync(p("input/kanjidic2.xml"), "utf8");
const dic = parseKanjidic2(kanjidicXml);
const header = readKanjidicHeader(kanjidicXml);
const mextJson = JSON.parse(readFileSync(p("data/mext-onkun-2017.json"), "utf8")) as { source: { title: string; url: string }; entries: MextEntry[] };
const mext = new Map(mextJson.entries.map((e) => [e.kanji, e]));
const overrides = JSON.parse(readFileSync(p("data/edu-readings-overrides.json"), "utf8")) as Record<string, ReadingOverride>;
const radicalOverrides = JSON.parse(readFileSync(p("data/radical-overrides.json"), "utf8")) as { overrides: Record<string, RadicalOverride> };
const joyoVariants = JSON.parse(readFileSync(p("data/joyo-variants.json"), "utf8")) as { variants: Record<string, string[]> };

const targets: { cp: number; kind: CharKind }[] = [];
// ⚠ 字集合は割り振り表（常用漢字表の 2,136 字）で決める。KANJIDIC2 の grade では決めない（ADR 0009）
const joyo = [...mextJson.entries].sort((a, b) => (a.grade ?? 7) - (b.grade ?? 7) || a.kanji.codePointAt(0)! - b.kanji.codePointAt(0)!);
for (const e of joyo) targets.push({ cp: e.kanji.codePointAt(0)!, kind: "kanji" });
for (let cp = 0x3041; cp <= 0x3096; cp++) targets.push({ cp, kind: "hiragana" });
for (let cp = 0x30a1; cp <= 0x30fa; cp++) targets.push({ cp, kind: "katakana" });
targets.push({ cp: 0x30fc, kind: "katakana" });

rmSync(p("dist/chars"), { recursive: true, force: true });
mkdirSync(p("dist/chars"), { recursive: true });
rmSync(p("dist/fonts"), { recursive: true, force: true });
mkdirSync(p("dist/fonts"), { recursive: true });
mkdirSync(p("build"), { recursive: true });

const warnings: string[] = [];
const index: DatasetIndex = {
  version: pkg.version,
  generatedAt: new Date().toISOString().slice(0, 10),
  license: "CC-BY-SA-4.0",
  sources: {
    kanjivg: { release: KANJIVG_RELEASE, license: "CC-BY-SA-3.0", url: KANJIVG_URL },
    kanjidic2: { databaseVersion: header.databaseVersion, dateOfCreation: header.dateOfCreation, license: "CC-BY-SA-4.0", url: KANJIDIC2_URL },
    mext: { title: mextJson.source.title, url: mextJson.source.url },
  },
  profilesVersion: table.version,
  counts: { kanji: 0, hiragana: 0, katakana: 0, strokes: 0 },
  chars: [],
};
const profileUse = new Map<string, number>();
let bytes = 0;
/** 手本フォントの材料。字データと同じ回の records から書き出す＝版が割れない（spec 2026-09-14 §3） */
const records: CharRecord[] = [];

for (const t of targets) {
  const cp = hex(t.cp);
  const svgPath = p(`input/kvg/kanji/${cp}.svg`);
  if (!existsSync(svgPath)) {
    warnings.push(`${String.fromCodePoint(t.cp)}: KanjiVG に無い（${cp}）`);
    continue;
  }
  const kvg = parseKanjiVg(readFileSync(svgPath, "utf8"));
  const char = String.fromCodePoint(t.cp);
  const { record, warnings: w } = buildChar({ kvg, dic: dic.get(char), mext: mext.get(char), override: overrides[char], table, radicalNames, kind: t.kind, variants: joyoVariants.variants[char], radicalOverride: radicalOverrides.overrides[char] });
  warnings.push(...w);
  const json = JSON.stringify(record, null, 2);
  bytes += Buffer.byteLength(json);
  writeFileSync(p(`dist/chars/${cp}.json`), json + "\n");
  records.push(record);
  index.counts[t.kind]++;
  index.counts.strokes += record.strokes.length;
  index.chars.push({ char, codepoint: cp, kind: t.kind, grade: record.grade, strokeCount: record.strokeCount });
  for (const s of record.strokes) profileUse.set(s.profile, (profileUse.get(s.profile) ?? 0) + 1);
}

writeFileSync(p("dist/index.json"), JSON.stringify(index, null, 2) + "\n");
const tehon = buildTehonFont(records);
writeFileSync(p("dist/fonts/tehon.otf"), tehon.otf);
writeFileSync(p(`dist/fonts/${TEHON_FILE}`), tehon.woff2);
const manifest = tehonManifest(tehon.woff2, tehon.glyphCount, { version: pkg.version, profilesVersion: table.version });
writeFileSync(p("dist/fonts/manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
const report = {
  generatedAt: new Date().toISOString(),
  counts: index.counts,
  files: readdirSync(p("dist/chars")).length,
  bytes,
  font: { bytes: manifest.bytes, sha256: manifest.sha256 },
  profileUse: Object.fromEntries([...profileUse].sort((a, b) => b[1] - a[1])),
  warnings,
};
writeFileSync(p("build/report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`chars ${report.files}（漢字 ${index.counts.kanji}・ひらがな ${index.counts.hiragana}・カタカナ ${index.counts.katakana}）・画 ${index.counts.strokes}・${(bytes / 1e6).toFixed(1)}MB・警告 ${warnings.length} 件`);
console.log(`手本フォント ${TEHON_FILE}・${manifest.glyphCount} 字・${(manifest.bytes / 1024).toFixed(0)}KB・sha256 ${manifest.sha256.slice(0, 16)}`);
for (const w of warnings.slice(0, 40)) console.log("  warn:", w);
if (warnings.length > 40) console.log(`  ... ほか ${warnings.length - 40} 件（build/report.json）`);
