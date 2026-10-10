import { createHash } from "node:crypto";
import opentype from "opentype.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildTehonFont, outlineToCommands, sfntChecksum, tehonManifest, TEHON_ATTRIBUTION, type TehonGlyphSource } from "./tehon.js";

const VB = [0, 0, 109, 109] as const;
// 座標は 109 → 1000 で割り切れる値にしてある（10.9 → 100, 54.5 → y=880-500=380）
const CHARS: TehonGlyphSource[] = [
  { char: "一", codepoint: "04e00", viewBox: VB, strokes: [{ outline: "M10.9,54.5L98.1,54.5L98.1,59.95L10.9,59.95Z" }] },
  {
    char: "二",
    codepoint: "04e8c",
    viewBox: VB,
    strokes: [{ outline: "M21.8,32.7L87.2,32.7L87.2,38.15Z" }, { outline: "M10.9,76.3L98.1,76.3L98.1,81.75Z" }],
  },
];

function parse(otf: Buffer) {
  return opentype.parse(otf.buffer.slice(otf.byteOffset, otf.byteOffset + otf.byteLength) as ArrayBuffer);
}

afterEach(() => {
  vi.useRealTimers();
});

describe("outlineToCommands", () => {
  it("viewBox の幅を 1000 に伸ばし、y を上向きに反転して整数に丸める", () => {
    expect(outlineToCommands("M10.9,54.5L98.1,54.5L98.1,59.95Z", VB)).toEqual([
      { type: "M", x: 100, y: 380 },
      { type: "L", x: 900, y: 380 },
      { type: "L", x: 900, y: 330 },
      { type: "Z" },
    ]);
  });

  it("曲線など直線以外が混ざったら黙って落とさず例外にする", () => {
    expect(() => outlineToCommands("M1,1C2,2,3,3,4,4Z", VB)).toThrow(/直線/);
  });
});

describe("buildTehonFont", () => {
  it("読み戻した各字の輪郭が、書いた命令列と一致する", () => {
    const { otf, glyphCount } = buildTehonFont(CHARS);
    const font = parse(otf);
    expect(glyphCount).toBe(2);
    expect(font.glyphs.length).toBe(3); // .notdef ＋ 2 字
    for (const c of CHARS) {
      const glyph = font.charToGlyph(c.char);
      expect(glyph.unicode).toBe(c.char.codePointAt(0));
      const got = glyph.path.commands.map((k) => (k.type === "Z" ? { type: "Z" } : { type: k.type, x: k.x, y: k.y }));
      expect(got).toEqual(c.strokes.flatMap((s) => outlineToCommands(s.outline, c.viewBox)));
    }
  });

  it("書き出す時刻が違っても同じバイト列になる（head.modified を固定している）", () => {
    const a = buildTehonFont(CHARS);
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    const b = buildTehonFont(CHARS);
    expect(Buffer.compare(a.otf, b.otf)).toBe(0);
    expect(Buffer.compare(a.woff2, b.woff2)).toBe(0);
  });

  it("チェックサムを引き直してあり、created と modified が揃っている", () => {
    const { otf } = buildTehonFont(CHARS);
    expect(sfntChecksum(otf, 0, otf.length)).toBe(0xb1b0afba);
    const font = parse(otf);
    // tsconfig の noUncheckedIndexedAccess により tables.head は `Table | undefined` 型になる。
    // パース済みフォントに head テーブルが無いことはあり得ないため非null断言で受ける。
    expect(font.tables.head!.modified).toBe(font.tables.head!.created);
  });

  it("woff2 で、名前テーブルに帰属とライセンスが入っている", () => {
    const { otf, woff2 } = buildTehonFont(CHARS);
    expect(woff2.subarray(0, 4).toString("latin1")).toBe("wOF2");
    const font = parse(otf);
    expect(font.getEnglishName("fontFamily")).toBe("DiglaboTehon");
    expect(font.getEnglishName("copyright")).toBe(TEHON_ATTRIBUTION);
    expect(font.getEnglishName("license")).toBe("CC BY-SA 4.0");
  });
});

/** sfnt の表を 1 つ切り出す（テスト用） */
function table(otf: Buffer, tag: string): Buffer | null {
  const count = otf.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const dir = 12 + i * 16;
    if (otf.toString("latin1", dir, dir + 4) !== tag) continue;
    const offset = otf.readUInt32BE(dir + 8);
    return otf.subarray(offset, offset + otf.readUInt32BE(dir + 12));
  }
  return null;
}

describe("縦書きでの字の置き方（2026-09-29 漢字だけ左に寄る件）", () => {
  it("横書きの行の上下は 936 / -64（合計 1000 のまま中心を Klee One と揃える）", () => {
    const { otf } = buildTehonFont(CHARS);
    const hhea = table(otf, "hhea")!;
    expect(hhea.readInt16BE(4)).toBe(936);
    expect(hhea.readInt16BE(6)).toBe(-64);
    const os2 = table(otf, "OS/2")!;
    expect(os2.readUInt16BE(74)).toBe(936); // usWinAscent
    expect(os2.readUInt16BE(76)).toBe(64); // usWinDescent
  });

  it("縦書き用の表（vhea・vmtx）を持ち、全字の送り幅は 1000・字の枠の上端は 880 のまま", () => {
    const { otf } = buildTehonFont(CHARS);
    const vhea = table(otf, "vhea")!;
    const vmtx = table(otf, "vmtx")!;
    expect(vhea.readUInt16BE(34)).toBe(3); // numOfLongVerMetrics（.notdef ＋ 2 字）
    const metrics = [0, 1, 2].map((i) => ({ advance: vmtx.readUInt16BE(i * 4), tsb: vmtx.readInt16BE(i * 4 + 2) }));
    // .notdef は輪郭なし。一 の上端は 380、二 の上端は 880 − 32.7/109×1000 = 580
    expect(metrics).toEqual([
      { advance: 1000, tsb: 0 },
      { advance: 1000, tsb: 880 - 380 },
      { advance: 1000, tsb: 880 - 580 },
    ]);
  });

  it("表を足しても、フォント全体のチェックサムと各表のチェックサムが合う", () => {
    const { otf } = buildTehonFont(CHARS);
    expect(sfntChecksum(otf, 0, otf.length)).toBe(0xb1b0afba);
    const count = otf.readUInt16BE(4);
    for (let i = 0; i < count; i++) {
      const dir = 12 + i * 16;
      const tag = otf.toString("latin1", dir, dir + 4);
      if (tag === "head") continue; // head は checkSumAdjustment を 0 として数える決まり
      expect(sfntChecksum(otf, otf.readUInt32BE(dir + 8), otf.readUInt32BE(dir + 12)), tag).toBe(otf.readUInt32BE(dir + 4));
    }
  });

  it("輪郭は今までどおり opentype.js で読み戻せる", () => {
    const font = parse(buildTehonFont(CHARS).otf);
    expect(font.charToGlyph("一").path.commands.length).toBeGreaterThan(0);
  });
});

describe("tehonManifest", () => {
  it("sha256 と bytes は woff2 の実バイトから取る", () => {
    const { woff2 } = buildTehonFont(CHARS);
    expect(tehonManifest(woff2, 2, { version: "9.9.9", profilesVersion: 3, extraChars: ["伊"] })).toEqual({
      version: "9.9.9",
      profilesVersion: 3,
      family: "DiglaboTehon",
      file: "tehon.woff2",
      sha256: createHash("sha256").update(woff2).digest("hex"),
      bytes: woff2.length,
      glyphCount: 2,
      extraChars: ["伊"],
    });
  });
});
