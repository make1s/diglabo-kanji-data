/**
 * 手本フォント（spec 2026-09-14 §3）。字レコードの筆圧アウトラインを 1 本の woff2 に束ねる。
 *
 * ⚠ 輪郭は直線（M/L/Z）だけで、全画の向きが揃っている（2026-09-13 に全 10,178 画で実測）。
 *   重なりを除かずに 1 グリフへ束ねても塗りが欠けない。曲線が来たら黙って落とさず例外にする。
 * ⚠ 同じ輪郭なら同じバイト列にする。sha256 が字形の指紋になり、変わると漢字 PDF が全部焼き直しになるため。
 *   opentype.js は head.modified に現在時刻を入れる（createdTimestamp で固定できるのは created だけ）ので、
 *   書き出したあとに modified を created に揃え、チェックサムを引き直す。版番号もフォントに入れない。
 */
import { createHash } from "node:crypto";
import opentype from "opentype.js";
import ttf2woff2 from "ttf2woff2";

export const TEHON_FAMILY = "DiglaboTehon";
export const TEHON_FILE = "tehon.woff2";
export const TEHON_ATTRIBUTION = "KanjiVG (CC BY-SA 3.0) / KANJIDIC2 © EDRDG (CC BY-SA 4.0)";

const UNITS_PER_EM = 1000;
const ASCENDER = 880;
const DESCENDER = -120;
/** 2026-09-07T00:00:00Z（v0.1.0 の公開日）。版を上げても変えない */
const CREATED_UNIX = 1788739200;
/** sfnt の決まり: フォント全体のチェックサムがこの値になるよう head.checkSumAdjustment を置く */
const CHECKSUM_MAGIC = 0xb1b0afba;

export interface TehonGlyphSource {
  char: string;
  /** 5 桁の小文字 16 進（グリフ名に使う） */
  codepoint: string;
  viewBox: readonly [number, number, number, number];
  strokes: readonly { outline: string }[];
}

export type TehonCommand = { type: "M" | "L"; x: number; y: number } | { type: "Z" };

export interface TehonManifest {
  version: string;
  profilesVersion: number;
  family: typeof TEHON_FAMILY;
  file: typeof TEHON_FILE;
  sha256: string;
  bytes: number;
  glyphCount: number;
}

const TOKEN = /([ML])(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)|Z/g;

/** -0 を 0 に揃えて丸める（-0 が混ざると同じ形でも比較が割れる） */
const round = (v: number): number => Math.round(v) || 0;

/** 輪郭 1 本（path d）をフォント座標の命令列にする。viewBox の幅を UPM に伸ばし、y を上向きに反転して整数に丸める */
export function outlineToCommands(outline: string, viewBox: TehonGlyphSource["viewBox"]): TehonCommand[] {
  const [vx, vy, vw] = viewBox;
  const scale = UNITS_PER_EM / vw;
  const out: TehonCommand[] = [];
  let consumed = 0;
  for (const m of outline.matchAll(TOKEN)) {
    const [whole, op, xs, ys] = m;
    consumed += whole.length;
    if (whole === "Z") {
      out.push({ type: "Z" });
      continue;
    }
    if ((op !== "M" && op !== "L") || xs === undefined || ys === undefined) throw new Error(`輪郭を読めない: ${whole}`);
    out.push({ type: op, x: round((Number(xs) - vx) * scale), y: round(ASCENDER - (Number(ys) - vy) * scale) });
  }
  if (consumed !== outline.length) throw new Error(`輪郭は直線（M/L/Z）だけのはず: ${outline.slice(0, 40)}…`);
  return out;
}

/** sfnt のチェックサム。4 バイトずつ big-endian で足して 2^32 で丸める。範囲の外（端数の埋め）は 0 として読む */
export function sfntChecksum(buf: Uint8Array, start: number, length: number): number {
  const end = start + length;
  const byteAt = (i: number): number => (i < end ? (buf[i] ?? 0) : 0);
  let sum = 0;
  for (let i = start; i < end; i += 4) {
    const word = byteAt(i) * 0x1000000 + (byteAt(i + 1) << 16) + (byteAt(i + 2) << 8) + byteAt(i + 3);
    sum = (sum + word) % 0x100000000;
  }
  return sum;
}

/** head.modified を created に揃え、head のチェックサムと checkSumAdjustment を引き直す */
function pinHeadModified(otf: Buffer): Buffer {
  const tableCount = otf.readUInt16BE(4);
  for (let i = 0; i < tableCount; i++) {
    const dir = 12 + i * 16;
    if (otf.toString("latin1", dir, dir + 4) !== "head") continue;
    const offset = otf.readUInt32BE(dir + 8);
    const length = otf.readUInt32BE(dir + 12);
    otf.copy(otf, offset + 28, offset + 20, offset + 28); // modified(+28) ← created(+20)
    otf.writeUInt32BE(0, offset + 8); // checkSumAdjustment は 0 として数える決まり
    otf.writeUInt32BE(sfntChecksum(otf, offset, length), dir + 4);
    otf.writeUInt32BE((CHECKSUM_MAGIC - sfntChecksum(otf, 0, otf.length) + 0x100000000) % 0x100000000, offset + 8);
    return otf;
  }
  throw new Error("head テーブルが無い");
}

export function buildTehonFont(chars: readonly TehonGlyphSource[]): { otf: Buffer; woff2: Buffer; glyphCount: number } {
  const glyphs = [new opentype.Glyph({ name: ".notdef", advanceWidth: UNITS_PER_EM, path: new opentype.Path() })];
  for (const c of chars) {
    const unicode = c.char.codePointAt(0);
    if (unicode === undefined) throw new Error(`字が空: ${c.codepoint}`);
    const path = new opentype.Path();
    for (const stroke of c.strokes) {
      for (const cmd of outlineToCommands(stroke.outline, c.viewBox)) {
        if (cmd.type === "M") path.moveTo(cmd.x, cmd.y);
        else if (cmd.type === "L") path.lineTo(cmd.x, cmd.y);
        else path.close();
      }
    }
    glyphs.push(new opentype.Glyph({ name: `u${c.codepoint}`, unicode, advanceWidth: UNITS_PER_EM, path }));
  }
  const font = new opentype.Font({
    familyName: TEHON_FAMILY,
    styleName: "Regular",
    unitsPerEm: UNITS_PER_EM,
    ascender: ASCENDER,
    descender: DESCENDER,
    createdTimestamp: CREATED_UNIX,
    version: "Version 1.000",
    copyright: TEHON_ATTRIBUTION,
    license: "CC BY-SA 4.0",
    licenseURL: "https://creativecommons.org/licenses/by-sa/4.0/",
    glyphs,
  });
  const otf = pinHeadModified(Buffer.from(font.toArrayBuffer()));
  const woff2: Buffer = ttf2woff2(otf);
  return { otf, woff2, glyphCount: chars.length };
}

export function tehonManifest(
  woff2: Uint8Array,
  glyphCount: number,
  meta: { version: string; profilesVersion: number }
): TehonManifest {
  return {
    version: meta.version,
    profilesVersion: meta.profilesVersion,
    family: TEHON_FAMILY,
    file: TEHON_FILE,
    sha256: createHash("sha256").update(woff2).digest("hex"),
    bytes: woff2.length,
    glyphCount,
  };
}
