/**
 * 全量ビルド: input/ → dist/chars/{codepoint}.json + dist/index.json、build/report.json
 * 対象: KANJIDIC2 で学年 1..6 の 1,026 字、ひらがな U+3041..3096、カタカナ U+30A1..30FA と長音符 U+30FC
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseKanjidic2, readKanjidicHeader } from "../kanjidic/parse.js";
import { parseKanjiVg } from "../kanjivg/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { validateProfileTable } from "../profiles/types.js";
import type { ReadingOverride } from "../readings/edu.js";
import { buildChar } from "./char.js";
import type { RadicalNameTable } from "./radical.js";
import { KANJIDIC2_URL, KANJIVG_RELEASE, KANJIVG_URL } from "./sources.js";
import type { CharKind, DatasetIndex } from "./types.js";

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

const targets: { cp: number; kind: CharKind }[] = [];
for (const e of [...dic.values()].filter((e) => e.grade !== null && e.grade <= 6).sort((a, b) => a.grade! - b.grade! || a.codepoint.localeCompare(b.codepoint))) {
  targets.push({ cp: Number.parseInt(e.codepoint, 16), kind: "kanji" });
}
for (let cp = 0x3041; cp <= 0x3096; cp++) targets.push({ cp, kind: "hiragana" });
for (let cp = 0x30a1; cp <= 0x30fa; cp++) targets.push({ cp, kind: "katakana" });
targets.push({ cp: 0x30fc, kind: "katakana" });

rmSync(p("dist/chars"), { recursive: true, force: true });
mkdirSync(p("dist/chars"), { recursive: true });
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

for (const t of targets) {
  const cp = hex(t.cp);
  const svgPath = p(`input/kvg/kanji/${cp}.svg`);
  if (!existsSync(svgPath)) {
    warnings.push(`${String.fromCodePoint(t.cp)}: KanjiVG に無い（${cp}）`);
    continue;
  }
  const kvg = parseKanjiVg(readFileSync(svgPath, "utf8"));
  const char = String.fromCodePoint(t.cp);
  const { record, warnings: w } = buildChar({ kvg, dic: dic.get(char), mext: mext.get(char), override: overrides[char], table, radicalNames, kind: t.kind });
  warnings.push(...w);
  const json = JSON.stringify(record, null, 2);
  bytes += Buffer.byteLength(json);
  writeFileSync(p(`dist/chars/${cp}.json`), json + "\n");
  index.counts[t.kind]++;
  index.counts.strokes += record.strokes.length;
  index.chars.push({ char, codepoint: cp, kind: t.kind, grade: record.grade, strokeCount: record.strokeCount });
  for (const s of record.strokes) profileUse.set(s.profile, (profileUse.get(s.profile) ?? 0) + 1);
}

writeFileSync(p("dist/index.json"), JSON.stringify(index, null, 2) + "\n");
const report = { generatedAt: new Date().toISOString(), counts: index.counts, files: readdirSync(p("dist/chars")).length, bytes, profileUse: Object.fromEntries([...profileUse].sort((a, b) => b[1] - a[1])), warnings };
writeFileSync(p("build/report.json"), JSON.stringify(report, null, 2) + "\n");
console.log(`chars ${report.files}（漢字 ${index.counts.kanji}・ひらがな ${index.counts.hiragana}・カタカナ ${index.counts.katakana}）・画 ${index.counts.strokes}・${(bytes / 1e6).toFixed(1)}MB・警告 ${warnings.length} 件`);
for (const w of warnings.slice(0, 40)) console.log("  warn:", w);
if (warnings.length > 40) console.log(`  ... ほか ${warnings.length - 40} 件（build/report.json）`);
