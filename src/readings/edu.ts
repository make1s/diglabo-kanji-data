import type { KanjidicEntry } from "../kanjidic/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";

/** 割り振り表から写せなかった読みを直す手当て。add は KANJIDIC2 の表記（送り仮名の `.` 付き）で書く */
export interface ReadingOverride {
  add?: string[];
  remove?: string[];
}

export interface EduReadings {
  on: string[];
  kun: string[];
  /** 割り振り表で1字下げだった読み（on/kun にも入っている） */
  special: string[];
  /** 割り振り表にはあるが KANJIDIC2 の読みに写せなかったもの */
  unmatched: string[];
}

const normalize = (r: string): string => r.replace(/[.\-]/g, "");
const isKatakana = (r: string): boolean => /^[ァ-ヺー]+$/u.test(r);

/**
 * 教育用読み＝割り振り表で小学校段階に○が付いた読み。表記は KANJIDIC2 の形に写す
 * （送り仮名の区切り `.` を得るため。同じ読みが複数あれば KANJIDIC2 の先のものを取る）。
 * 順序は割り振り表の順で、1字下げの読みは末尾に回す。
 */
export function selectEduReadings(entry: KanjidicEntry, mext: MextEntry | undefined, override?: ReadingOverride): EduReadings {
  const on: string[] = [];
  const kun: string[] = [];
  const specialOn: string[] = [];
  const specialKun: string[] = [];
  const special: string[] = [];
  const unmatched: string[] = [];
  if (mext) {
    for (const r of mext.readings) {
      if (r.stage !== "elementary") continue;
      const pool = r.kind === "on" ? entry.on : entry.kun;
      const hit = pool.find((k) => normalize(k) === r.reading);
      if (!hit) {
        unmatched.push(r.reading);
        continue;
      }
      const target = r.kind === "on" ? (r.special ? specialOn : on) : r.special ? specialKun : kun;
      if (!target.includes(hit)) target.push(hit);
      if (r.special && !special.includes(hit)) special.push(hit);
    }
  }
  on.push(...specialOn.filter((r) => !on.includes(r)));
  kun.push(...specialKun.filter((r) => !kun.includes(r)));
  for (const a of override?.add ?? []) {
    const target = isKatakana(a) ? on : kun;
    if (!target.includes(a)) target.push(a);
    // 手当てで足した読みが、写せなかった読みそのものなら unmatched から消す
    const i = unmatched.indexOf(normalize(a));
    if (i >= 0) unmatched.splice(i, 1);
  }
  for (const rm of override?.remove ?? []) {
    for (const list of [on, kun, special]) {
      const i = list.indexOf(rm);
      if (i >= 0) list.splice(i, 1);
    }
  }
  return { on, kun, special, unmatched };
}
