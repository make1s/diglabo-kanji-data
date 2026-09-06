/**
 * input/mext-onkun-2017.tsv（pdftotext -tsv）を data/mext-onkun-2017.json にする。
 * 検証: ○の総数＝読みの総数、学年つき漢字が 1,026 字で KANJIDIC2 の学年と全字一致。
 */
import { readFileSync, writeFileSync } from "node:fs";
import { parseKanjidic2 } from "../src/kanjidic/parse.js";
import { parseMextTsv } from "../src/mext/parse-tsv.js";

const tsv = readFileSync(new URL("../input/mext-onkun-2017.tsv", import.meta.url), "utf8");
const { entries, warnings } = parseMextTsv(tsv);

// 𠮟（U+20B9F）は PDF の文字層に無い（画像で置かれている）ため、その読み シツ・しかる が直前の「七」に付く。ここで戻す。
// PDF が変わって前提が崩れたら止まる
{
  const shichi = entries.find((e) => e.kanji === "七");
  const moved = shichi?.readings.filter((r) => r.reading === "シツ" || r.reading === "しかる") ?? [];
  if (!shichi || moved.length !== 2 || moved.some((r) => r.stage !== "junior")) throw new Error("𠮟 の補正の前提が崩れた（七に シツ・しかる が付いていない）");
  shichi.readings = shichi.readings.filter((r) => !moved.includes(r));
  entries.splice(entries.indexOf(shichi) + 1, 0, { kanji: "𠮟", grade: null, readings: moved });
}
const appendixPage = Math.min(...tsv.split("\n").filter((l) => /\t付表[１1]$/.test(l)).map((l) => Number(l.split("\t")[1])));
const circles = tsv.split("\n").filter((l) => l.endsWith("\t○") && Number(l.split("\t")[1]) < appendixPage).length;
const readings = entries.reduce((n, e) => n + e.readings.length, 0);
console.log(`漢字 ${entries.length} 字・読み ${readings} 件（○ ${circles} 個）・警告 ${warnings.length} 件`);
for (const w of warnings) console.log("  warn:", w);

const dic = parseKanjidic2(readFileSync(new URL("../input/kanjidic2.xml", import.meta.url), "utf8"));
const edu = [...dic.values()].filter((e) => e.grade !== null && e.grade <= 6);
const graded = entries.filter((e) => e.grade !== null);
const mismatch = edu.filter((e) => entries.find((m) => m.kanji === e.char)?.grade !== e.grade).map((e) => e.char);
const dup = entries.map((e) => e.kanji).filter((k, i, a) => a.indexOf(k) !== i);
console.log(`学年つき ${graded.length} 字（KANJIDIC2 の教育漢字 ${edu.length} 字）・学年不一致 ${mismatch.length} 字 ${mismatch.join("")}・重複 ${dup.length} ${dup.join("")}`);
const stages = { elementary: 0, junior: 0, senior: 0 };
let specials = 0;
for (const e of entries) for (const r of e.readings) {
  stages[r.stage]++;
  if (r.special) specials++;
}
console.log("段階別", JSON.stringify(stages), "1字下げ", specials);

if (warnings.length > 0 || circles !== readings || mismatch.length > 0 || dup.length > 0 || entries.length !== 2136) {
  console.error("検証に失敗した。data/ は書かない");
  process.exit(1);
}
const out = {
  source: {
    title: "音訓の小・中・高等学校段階別割り振り表（平成29年3月）",
    publisher: "文部科学省",
    url: "https://www.mext.go.jp/a_menu/shotou/new-cs/__icsFiles/afieldfile/2017/05/15/1385768.pdf",
    note: "pdftotext -tsv の座標から機械的に読み取った。付表１・付表２（熟字訓・都道府県）は含まない。𠮟 は文字層に無いので読みを手当てで戻している",
  },
  entries,
};
writeFileSync(new URL("../data/mext-onkun-2017.json", import.meta.url), JSON.stringify(out, null, 1).replace(/\n\s+"reading"/g, ' "reading"'));
console.log("wrote data/mext-onkun-2017.json");
