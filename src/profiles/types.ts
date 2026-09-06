/** 端の形。round＝半円のとめ、flat＝切りっぱなし、point＝端の太さを 0 に強制（はらい・はね） */
export type Cap = "round" | "flat" | "point";

/**
 * 終端側で太さを 1→0 に落とす領域。倍率は (1-u)^ease（u は領域内の進み 0→1）。
 * lastSegment: 領域＝最後の3次ベジエ1本の弧長（KanjiVG は はね を最後のセグメントとして分けて描く）
 * fraction/maxLen: 領域＝min(全長×fraction, maxLen)
 */
export type EndTaper = { ease?: number } & ({ lastSegment: true } | { fraction: number; maxLen: number });

/**
 * 画種ごとの太さの設計図。太さ w(s) = stemWidth × width × keys(s/L) × taper(s)。
 * keys は [弧長比率, 倍率] の折れ線（0 始まり 1 終わり）。
 */
export interface StrokeProfile {
  width: number;
  start: Cap;
  end: Cap;
  keys: [number, number][];
  endTaper?: EndTaper;
}

export interface ProfileTable {
  version: number;
  /** 109 単位系での縦画の基準の太さ */
  stemWidth: number;
  profiles: Record<string, StrokeProfile>;
}

/** 教育漢字 9,662 画に現れる kvg:type の基本形 25 種（添字と「／」を除いたもの） */
export const BASE_STROKE_TYPES = [
  "㇐", "㇑", "㇒", "㇔", "㇏", "㇕", "㇇", "㇚", "㇀", "㇆", "㇜", "㇟", "㇖",
  "㇁", "㇙", "㇂", "㇃", "㇋", "㇛", "㇓", "㇄", "㇉", "㇗", "㇈", "㇞",
] as const;

const CAPS: ReadonlySet<string> = new Set(["round", "flat", "point"]);

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function assertPositive(v: unknown, what: string): asserts v is number {
  if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) throw new Error(`${what} は正の数でなければならない: ${String(v)}`);
}

function validateProfile(key: string, v: unknown): StrokeProfile {
  if (!isRecord(v)) throw new Error(`${key}: 設計図がオブジェクトでない`);
  assertPositive(v["width"], `${key}.width`);
  if (typeof v["start"] !== "string" || !CAPS.has(v["start"])) throw new Error(`${key}.start が不正: ${String(v["start"])}`);
  if (typeof v["end"] !== "string" || !CAPS.has(v["end"])) throw new Error(`${key}.end が不正: ${String(v["end"])}`);
  const keys = v["keys"];
  if (!Array.isArray(keys) || keys.length < 2) throw new Error(`${key}.keys は2点以上の折れ線でなければならない`);
  let prevPos = -1;
  for (const k of keys) {
    if (!Array.isArray(k) || k.length !== 2 || typeof k[0] !== "number" || typeof k[1] !== "number") throw new Error(`${key}.keys の要素が [位置, 倍率] でない`);
    if (k[0] <= prevPos) throw new Error(`${key}.keys の位置が単調増加でない`);
    if (k[1] < 0) throw new Error(`${key}.keys の倍率が負`);
    prevPos = k[0];
  }
  if (keys[0][0] !== 0 || keys[keys.length - 1][0] !== 1) throw new Error(`${key}.keys は 0 で始まり 1 で終わらなければならない`);
  const profile: StrokeProfile = { width: v["width"], start: v["start"] as Cap, end: v["end"] as Cap, keys: keys as [number, number][] };
  if (v["endTaper"] !== undefined) {
    const t = v["endTaper"];
    if (!isRecord(t)) throw new Error(`${key}.endTaper がオブジェクトでない`);
    if (t["ease"] !== undefined) assertPositive(t["ease"], `${key}.endTaper.ease`);
    if (t["lastSegment"] === true) {
      profile.endTaper = t["ease"] === undefined ? { lastSegment: true } : { lastSegment: true, ease: t["ease"] };
    } else {
      assertPositive(t["fraction"], `${key}.endTaper.fraction`);
      if (t["fraction"] > 1) throw new Error(`${key}.endTaper.fraction は 1 以下`);
      assertPositive(t["maxLen"], `${key}.endTaper.maxLen`);
      profile.endTaper = t["ease"] === undefined ? { fraction: t["fraction"], maxLen: t["maxLen"] } : { fraction: t["fraction"], maxLen: t["maxLen"], ease: t["ease"] };
    }
  }
  return profile;
}

/** JSON を読んで形を検証し、型のついた表にする */
export function validateProfileTable(json: unknown): ProfileTable {
  if (!isRecord(json)) throw new Error("設計図の表がオブジェクトでない");
  if (typeof json["version"] !== "number") throw new Error("version が無い");
  assertPositive(json["stemWidth"], "stemWidth");
  if (!isRecord(json["profiles"])) throw new Error("profiles が無い");
  const profiles: Record<string, StrokeProfile> = {};
  for (const [key, v] of Object.entries(json["profiles"])) profiles[key] = validateProfile(key, v);
  return { version: json["version"], stemWidth: json["stemWidth"], profiles };
}
