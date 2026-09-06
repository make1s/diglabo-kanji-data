import type { ProfileTable } from "./types.js";

/** 型なし（かな）の画に使う鍵 */
export const UNTYPED_KEY = "kana";

/**
 * kvg:type から設計図の鍵を決める。完全一致 → 「／」の左側 → 添字（末尾の英小文字）を落とした基本形 の順。
 * 「／」は KanjiVG の文書では「どちらの形もあり得る」の意味だが、紙に出る形は path が決めるので左側で引く（設計判断 2026-09-06）。
 * 型が無い画（かなの 515 画中 513 画）は `kana`。
 */
export function resolveProfileKey(type: string | null | undefined, table: ProfileTable): string {
  if (!type) {
    if (table.profiles[UNTYPED_KEY]) return UNTYPED_KEY;
    throw new Error(`設計図に ${UNTYPED_KEY} が無い`);
  }
  const candidates = [type];
  const left = type.split(/[／/]/)[0]!;
  if (left !== type) candidates.push(left);
  const base = left.replace(/[a-z]+$/, "");
  if (base !== left) candidates.push(base);
  for (const c of candidates) if (table.profiles[c]) return c;
  throw new Error(`設計図が無い画種: ${type}`);
}
