import { describe, expect, it } from "vitest";
import type { KanjidicEntry } from "../kanjidic/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { selectReadingStages } from "./stages.js";

const dic = (on: string[], kun: string[]): KanjidicEntry => ({
  char: "x", codepoint: "00000", grade: null, strokeCount: 1, radicalClassical: null, on, kun, meanings: [],
});

describe("selectReadingStages", () => {
  it("小学校は教育用読み（手当て済み）をそのまま、中学・高校は割り振り表を KANJIDIC2 の表記に写す", () => {
    const mext: MextEntry = {
      kanji: "化", grade: 3,
      readings: [
        { reading: "カ", kind: "on", stage: "elementary", special: false },
        { reading: "ケ", kind: "on", stage: "junior", special: false },
        { reading: "ばける", kind: "kun", stage: "elementary", special: false },
        { reading: "ばかす", kind: "kun", stage: "elementary", special: false },
      ],
    };
    const got = selectReadingStages(dic(["カ", "ケ"], ["ば.ける", "ば.かす", "ふ.ける"]), mext, { on: ["カ"], kun: ["ば.ける", "ば.かす"] });
    expect(got).toEqual({
      on: [{ reading: "カ", stage: "elementary" }, { reading: "ケ", stage: "junior" }],
      kun: [{ reading: "ば.ける", stage: "elementary" }, { reading: "ば.かす", stage: "elementary" }],
    });
  });

  it("中学で習う字は教育用読みが空で、全部が junior か senior", () => {
    const mext: MextEntry = {
      kanji: "𠮟", grade: null,
      readings: [
        { reading: "シツ", kind: "on", stage: "junior", special: false },
        { reading: "しかる", kind: "kun", stage: "junior", special: false },
      ],
    };
    expect(selectReadingStages(dic(["シツ"], ["しか.る"]), mext, { on: [], kun: [] })).toEqual({
      on: [{ reading: "シツ", stage: "junior" }],
      kun: [{ reading: "しか.る", stage: "junior" }],
    });
  });

  it("KANJIDIC2 に写せない読みは割り振り表の表記のまま持つ", () => {
    const mext: MextEntry = { kanji: "x", grade: null, readings: [{ reading: "うけたまわる", kind: "kun", stage: "senior", special: false }] };
    expect(selectReadingStages(dic([], []), mext, { on: [], kun: [] }).kun).toEqual([{ reading: "うけたまわる", stage: "senior" }]);
  });

  it("割り振り表が無い字（かな）は空", () => {
    expect(selectReadingStages(dic([], []), undefined, { on: [], kun: [] })).toEqual({ on: [], kun: [] });
  });
});
