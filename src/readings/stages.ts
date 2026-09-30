import type { KanjidicEntry } from "../kanjidic/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";

export type ReadingStage = "elementary" | "junior" | "senior";
export interface StagedReading { reading: string; stage: ReadingStage }
export interface ReadingStages { on: StagedReading[]; kun: StagedReading[] }

// ⚠ 割り振り表の訓は送り仮名の区切りが無い（あわれむ）。KANJIDIC2 は あわ.れむ・接辞は -じ
const normalize = (r: string): string => r.replace(/[.\-]/g, "");

/**
 * 読みの段階つきの読み（spec 2026-09-28-kanji-learning-stage-design §2 の形）。
 * 小学校は教育用読み（手当て済みの eduReadings）をそのまま使い、中学・高校は割り振り表の読みを KANJIDIC2 の表記に写す。
 * KANJIDIC2 に無い読みは割り振り表の表記のまま持つ（送り仮名の区切りは無くなるが、読みとしては照合できる）。
 * 順序は 小学校（教育用読みの順）→ 中学・高校（割り振り表の順）。
 */
export function selectReadingStages(entry: KanjidicEntry, mext: MextEntry | undefined, edu: { on: string[]; kun: string[] }): ReadingStages {
  const out: ReadingStages = {
    on: edu.on.map((reading) => ({ reading, stage: "elementary" as const })),
    kun: edu.kun.map((reading) => ({ reading, stage: "elementary" as const })),
  };
  for (const r of mext?.readings ?? []) {
    if (r.stage === "elementary") continue;
    const pool = r.kind === "on" ? entry.on : entry.kun;
    const reading = pool.find((k) => normalize(k) === r.reading) ?? r.reading;
    const target = r.kind === "on" ? out.on : out.kun;
    if (!target.some((t) => t.reading === reading)) target.push({ reading, stage: r.stage });
  }
  return out;
}
