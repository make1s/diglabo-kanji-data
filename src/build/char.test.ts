import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { A, KA } from "../fixtures/kanjivg-samples.js";
import type { KanjidicEntry } from "../kanjidic/parse.js";
import { parseKanjiVg } from "../kanjivg/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { validateProfileTable } from "../profiles/types.js";
import { buildChar } from "./char.js";
import type { RadicalNameTable } from "./radical.js";

const table = validateProfileTable(JSON.parse(readFileSync(new URL("../../data/stroke-profiles.json", import.meta.url), "utf8")));
const radicalNames = JSON.parse(readFileSync(new URL("../../data/radical-names.json", import.meta.url), "utf8")) as RadicalNameTable;
const dic: KanjidicEntry = {
  char: "化", codepoint: "05316", grade: 3, strokeCount: 4, radicalClassical: 21,
  on: ["カ", "ケ"], kun: ["ば.ける", "ば.かす", "ふ.ける", "け.する"], meanings: ["change", "take the form of"],
};
const mext: MextEntry = {
  kanji: "化", grade: 3,
  readings: [
    { reading: "カ", kind: "on", stage: "elementary", special: false },
    { reading: "ケ", kind: "on", stage: "junior", special: false },
    { reading: "ばける", kind: "kun", stage: "elementary", special: false },
    { reading: "ばかす", kind: "kun", stage: "elementary", special: false },
  ],
};

describe("buildChar", () => {
  const { record, warnings } = buildChar({ kvg: parseKanjiVg(KA), dic, mext, table, radicalNames, kind: "kanji" });

  it("基本情報と読み", () => {
    expect(record.char).toBe("化");
    expect(record.codepoint).toBe("05316");
    expect(record.kind).toBe("kanji");
    expect(record.grade).toBe(3);
    expect(record.strokeCount).toBe(4);
    // 「化」は KanjiVG に general の印が無く、伝統部首（匕）に落ちる
    expect(record.radical).toEqual({
      number: 21, element: "匕", position: "right", name: "ひ", strokes: [3, 4], source: "tradit",
    });
    expect(record.readings).toEqual({ on: ["カ", "ケ"], kun: ["ば.ける", "ば.かす", "ふ.ける", "け.する"] });
    expect(record.eduReadings).toEqual({ on: ["カ"], kun: ["ば.ける", "ば.かす"] });
    expect(record.eduReadingsSpecial).toEqual([]);
    expect(record.meanings).toEqual(["change", "take the form of"]);
    expect(record.viewBox).toEqual([0, 0, 109, 109]);
    expect(warnings).toEqual([]);
  });

  it("画: アウトラインは閉じ、bbox は viewBox 内、設計図の鍵が解決される", () => {
    expect(record.strokes).toHaveLength(4);
    for (const s of record.strokes) {
      expect(s.outline).toMatch(/^M[-\d.,L]+Z$/);
      const [x, y, w, h] = s.bbox;
      expect(x).toBeGreaterThanOrEqual(-1);
      expect(y).toBeGreaterThanOrEqual(-1);
      expect(x + w).toBeLessThanOrEqual(110);
      expect(y + h).toBeLessThanOrEqual(110);
      expect(s.length).toBeGreaterThan(10);
    }
    expect(record.strokes[0]).toMatchObject({ n: 1, type: "㇒", profile: "㇒", numberAt: [27.25, 21.13] });
    expect(record.strokes[3]).toMatchObject({ n: 4, type: "㇟", profile: "㇟" });
    expect(record.strokes[0]?.centerline).toBe(parseKanjiVg(KA).strokes[0]?.d);
  });

  it("部品階層: 子は2つ、画の集合と bbox が入る", () => {
    expect(record.parts.element).toBe("化");
    expect(record.parts.strokes).toEqual([1, 2, 3, 4]);
    expect(record.parts.children).toHaveLength(2);
    expect(record.parts.children[0]).toMatchObject({ element: "亻", original: "人", variant: true, position: "left", radical: "nelson", strokes: [1, 2] });
    expect(record.parts.children[1]).toMatchObject({ element: "匕", position: "right", strokes: [3, 4] });
    expect(record.parts.children[1]).not.toHaveProperty("variant");
    const [x, y, w, h] = record.parts.bbox;
    for (const s of record.strokes) {
      expect(s.bbox[0]).toBeGreaterThanOrEqual(x - 1e-6);
      expect(s.bbox[1]).toBeGreaterThanOrEqual(y - 1e-6);
      expect(s.bbox[0] + s.bbox[2]).toBeLessThanOrEqual(x + w + 1e-6);
      expect(s.bbox[1] + s.bbox[3]).toBeLessThanOrEqual(y + h + 1e-6);
    }
  });

  it("画数が KANJIDIC2 と違えば warning", () => {
    const out = buildChar({ kvg: parseKanjiVg(KA), dic: { ...dic, strokeCount: 5 }, mext, table, radicalNames, kind: "kanji" });
    expect(out.warnings.some((w) => /画数/.test(w))).toBe(true);
  });

  it("写せなかった教育用読みは warning", () => {
    const out = buildChar({ kvg: parseKanjiVg(KA), dic, mext: { ...mext, readings: [{ reading: "ほげ", kind: "kun", stage: "elementary", special: false }] }, table, radicalNames, kind: "kanji" });
    expect(out.warnings.some((w) => /ほげ/.test(w))).toBe(true);
  });

  it("かなは KANJIDIC2 無しで組める", () => {
    const out = buildChar({ kvg: parseKanjiVg(A), table, radicalNames, kind: "hiragana" });
    expect(out.record.char).toBe("あ");
    expect(out.record.grade).toBeNull();
    expect(out.record.radical).toBeNull();
    expect(out.record.readings).toEqual({ on: [], kun: [] });
    expect(out.record.strokes.every((s) => s.profile === "kana" && s.type === null)).toBe(true);
    expect(out.record.parts.children).toEqual([]);
    expect(out.warnings).toEqual([]);
  });
});
