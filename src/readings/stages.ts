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
 * KANJIDIC2 に無い読みは手当ての表（data/stage-readings-overrides.json）の表記で持つ。表にも無ければ割り振り表の表記のまま持ち、
 * unmatched に挙げる（build が警告する。送り仮名の区切りが無いまま黙って入れない）。
 * 順序は 小学校（教育用読みの順）→ 中学・高校（割り振り表の順）。
 */
export function selectReadingStages(
  entry: KanjidicEntry,
  mext: MextEntry | undefined,
  edu: { on: string[]; kun: string[] },
  fixes: Record<string, string> = {}
): ReadingStages & { unmatched: string[] } {
  const out: ReadingStages = {
    on: edu.on.map((reading) => ({ reading, stage: "elementary" as const })),
    kun: edu.kun.map((reading) => ({ reading, stage: "elementary" as const })),
  };
  const unmatched: string[] = [];
  for (const r of mext?.readings ?? []) {
    if (r.stage === "elementary") continue;
    const pool = r.kind === "on" ? entry.on : entry.kun;
    const fixed = fixes[r.reading];
    if (fixed !== undefined && normalize(fixed) !== r.reading) {
      throw new Error(`読みの手当て「${r.reading}」→「${fixed}」は区切りを除くと元の読みと違う`);
    }
    const hit = pool.find((k) => normalize(k) === r.reading) ?? fixed;
    if (hit === undefined) unmatched.push(r.reading);
    const reading = hit ?? r.reading;
    const target = r.kind === "on" ? out.on : out.kun;
    if (!target.some((t) => t.reading === reading)) target.push({ reading, stage: r.stage });
  }
  return { ...out, unmatched };
}
