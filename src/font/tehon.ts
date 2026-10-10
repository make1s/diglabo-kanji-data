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
/** 字の枠（em）の上端。輪郭は KanjiVG の y=0 をここに置く（枠は 880〜-120） */
const EM_TOP = 880;
/**
 * 横書きの行の上下（hhea・OS/2）。字の枠（880 / -120）とは別に持つ。
 * ⚠ 紙とサイトでは、かなは Klee One（行の上下 1160 / -288、中心 436）、漢字はこのフォントで同じ行に並ぶ。
 *   縦書きの Chrome は字を「行の上下の中心」で揃えるので、880 / -120（中心 380）のままだと漢字だけが
 *   字の大きさの約 6% 左に寄った（2026-09-29 マスター指摘。答え版の送り仮名の枠で目立った）。
 *   中心を 436 に揃え、合計は 1000 のまま（横書きの行の高さを変えない）にしたのが 936 / -64。
 */
const LINE_ASCENDER = 936;
const LINE_DESCENDER = -64;
/** 縦書きの 1 字の送り幅。vmtx が無いと Chrome は行の上下の合計から作るので、表で 1000 に固定する */
const VERTICAL_ADVANCE = 1000;
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
  /** 字データに無く、フォントだけに入れた字（data/tehon-extra-chars.json）。codepoint 順 */
  extraChars: string[];
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
    out.push({ type: op, x: round((Number(xs) - vx) * scale), y: round(EM_TOP - (Number(ys) - vy) * scale) });
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

/** OS/2 の usWinAscent / usWinDescent の位置（opentype.js は字形の外接から決めるので書き直す） */
const OS2_WIN_ASCENT = 74;
const OS2_WIN_DESCENT = 76;

/** vhea（36 バイト）。上下は字の枠の中心を 0 にした ±500 */
function vheaTable(tops: readonly (number | null)[], bottoms: readonly (number | null)[]): Buffer {
  const tsbs = tops.map((t) => EM_TOP - (t ?? EM_TOP));
  const bsbs = bottoms.map((b, i) => (b === null ? 0 : VERTICAL_ADVANCE - (tsbs[i] ?? 0) - ((tops[i] ?? 0) - b)));
  const extents = tops.map((t, i) => (t === null ? 0 : (tsbs[i] ?? 0) + (t - (bottoms[i] ?? t))));
  const buf = Buffer.alloc(36);
  buf.writeUInt32BE(0x00011000, 0); // version 1.1
  buf.writeInt16BE(UNITS_PER_EM / 2, 4); // vertTypoAscender
  buf.writeInt16BE(-UNITS_PER_EM / 2, 6); // vertTypoDescender
  buf.writeInt16BE(0, 8); // vertTypoLineGap
  buf.writeUInt16BE(VERTICAL_ADVANCE, 10); // advanceHeightMax
  buf.writeInt16BE(Math.min(...tsbs), 12); // minTopSideBearing
  buf.writeInt16BE(Math.min(...bsbs), 14); // minBottomSideBearing
  buf.writeInt16BE(Math.max(...extents), 16); // yMaxExtent
  buf.writeInt16BE(0, 18); // caretSlopeRise
  buf.writeInt16BE(1, 20); // caretSlopeRun
  // 22〜33: caretOffset と reserved×4、metricDataFormat は 0 のまま
  buf.writeUInt16BE(tops.length, 34); // numOfLongVerMetrics
  return buf;
}

/** vmtx。全字が送り幅 1000、上の余白は字の枠の上端（880）から輪郭の上端まで */
function vmtxTable(tops: readonly (number | null)[]): Buffer {
  const buf = Buffer.alloc(tops.length * 4);
  tops.forEach((t, i) => {
    buf.writeUInt16BE(VERTICAL_ADVANCE, i * 4);
    buf.writeInt16BE(EM_TOP - (t ?? EM_TOP), i * 4 + 2);
  });
  return buf;
}

/**
 * opentype.js が書かない縦書き用の表を足し、OS/2 の win の上下を行の上下に揃えて sfnt を組み直す。
 * 表は tag の順に並べ、4 バイト境界に揃え、各表のチェックサムを引き直す（head は pinHeadModified が引く）。
 */
function withVerticalMetrics(otf: Buffer, tops: readonly (number | null)[], bottoms: readonly (number | null)[]): Buffer {
  const tables = new Map<string, Buffer>();
  const count = otf.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const dir = 12 + i * 16;
    const offset = otf.readUInt32BE(dir + 8);
    tables.set(otf.toString("latin1", dir, dir + 4), Buffer.from(otf.subarray(offset, offset + otf.readUInt32BE(dir + 12))));
  }
  const maxp = tables.get("maxp");
  const os2 = tables.get("OS/2");
  if (!maxp || !os2) throw new Error("maxp か OS/2 が無い");
  if (maxp.readUInt16BE(4) !== tops.length) throw new Error(`字形の数が合わない（maxp ${maxp.readUInt16BE(4)}・縦の表 ${tops.length}）`);
  os2.writeUInt16BE(LINE_ASCENDER, OS2_WIN_ASCENT);
  os2.writeUInt16BE(-LINE_DESCENDER, OS2_WIN_DESCENT);
  tables.set("vhea", vheaTable(tops, bottoms));
  tables.set("vmtx", vmtxTable(tops));

  const tags = [...tables.keys()].sort();
  const pad = (n: number): number => (n + 3) & ~3;
  const dirSize = 12 + tags.length * 16;
  const total = tags.reduce((sum, t) => sum + pad(tables.get(t)!.length), dirSize);
  const out = Buffer.alloc(total);
  otf.copy(out, 0, 0, 4); // sfntVersion（OTTO）
  const entrySelector = Math.floor(Math.log2(tags.length));
  const searchRange = 2 ** entrySelector * 16;
  out.writeUInt16BE(tags.length, 4);
  out.writeUInt16BE(searchRange, 6);
  out.writeUInt16BE(entrySelector, 8);
  out.writeUInt16BE(tags.length * 16 - searchRange, 10);
  let offset = dirSize;
  tags.forEach((tag, i) => {
    const data = tables.get(tag)!;
    data.copy(out, offset);
    const dir = 12 + i * 16;
    out.write(tag, dir, 4, "latin1");
    out.writeUInt32BE(sfntChecksum(out, offset, data.length), dir + 4);
    out.writeUInt32BE(offset, dir + 8);
    out.writeUInt32BE(data.length, dir + 12);
    offset += pad(data.length);
  });
  return out;
}

export function buildTehonFont(chars: readonly TehonGlyphSource[]): { otf: Buffer; woff2: Buffer; glyphCount: number } {
  const glyphs = [new opentype.Glyph({ name: ".notdef", advanceWidth: UNITS_PER_EM, path: new opentype.Path() })];
  // 縦書きの表のための、字ごとの輪郭の上端・下端（輪郭の無い字は null）。glyphs と同じ並び
  const tops: (number | null)[] = [null];
  const bottoms: (number | null)[] = [null];
  for (const c of chars) {
    const unicode = c.char.codePointAt(0);
    if (unicode === undefined) throw new Error(`字が空: ${c.codepoint}`);
    const path = new opentype.Path();
    let top: number | null = null;
    let bottom: number | null = null;
    for (const stroke of c.strokes) {
      for (const cmd of outlineToCommands(stroke.outline, c.viewBox)) {
        if (cmd.type === "Z") {
          path.close();
          continue;
        }
        top = top === null ? cmd.y : Math.max(top, cmd.y);
        bottom = bottom === null ? cmd.y : Math.min(bottom, cmd.y);
        if (cmd.type === "M") path.moveTo(cmd.x, cmd.y);
        else path.lineTo(cmd.x, cmd.y);
      }
    }
    tops.push(top);
    bottoms.push(bottom);
    glyphs.push(new opentype.Glyph({ name: `u${c.codepoint}`, unicode, advanceWidth: UNITS_PER_EM, path }));
  }
  const font = new opentype.Font({
    familyName: TEHON_FAMILY,
    styleName: "Regular",
    unitsPerEm: UNITS_PER_EM,
    ascender: LINE_ASCENDER,
    descender: LINE_DESCENDER,
    createdTimestamp: CREATED_UNIX,
    version: "Version 1.000",
    copyright: TEHON_ATTRIBUTION,
    license: "CC BY-SA 4.0",
    licenseURL: "https://creativecommons.org/licenses/by-sa/4.0/",
    glyphs,
  });
  const otf = pinHeadModified(withVerticalMetrics(Buffer.from(font.toArrayBuffer()), tops, bottoms));
  const woff2: Buffer = ttf2woff2(otf);
  return { otf, woff2, glyphCount: chars.length };
}

export function tehonManifest(
  woff2: Uint8Array,
  glyphCount: number,
  meta: { version: string; profilesVersion: number; extraChars: readonly string[] }
): TehonManifest {
  return {
    version: meta.version,
    profilesVersion: meta.profilesVersion,
    family: TEHON_FAMILY,
    file: TEHON_FILE,
    sha256: createHash("sha256").update(woff2).digest("hex"),
    bytes: woff2.length,
    glyphCount,
    extraChars: [...meta.extraChars],
  };
}
