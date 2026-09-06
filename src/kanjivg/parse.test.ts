import { describe, expect, it } from "vitest";
import { A, GYOU, KA } from "../fixtures/kanjivg-samples.js";
import { parseKanjiVg } from "./parse.js";


describe("parseKanjiVg", () => {
  it("化: 画・画番号・部品の入れ子を読む", () => {
    const c = parseKanjiVg(KA);
    expect(c.codepoint).toBe("05316");
    expect(c.strokes).toHaveLength(4);
    expect(c.strokes[0]).toEqual({ n: 1, type: "㇒", d: "M37.25,20.25c0.24,1.93-0.07,4.46-0.83,6.12c-4.89,10.56-11.58,20.95-22.79,33.79" });
    expect(c.strokes[3]?.type).toBe("㇟");
    expect(c.numbers).toHaveLength(4);
    expect(c.numbers[0]).toEqual([27.25, 21.13]);
    expect(c.root.attrs).toEqual({ element: "化" });
    expect(c.root.strokes).toEqual([]);
    expect(c.root.children).toHaveLength(2);
    expect(c.root.children[0]?.attrs).toEqual({ element: "亻", variant: "true", original: "人", position: "left", radical: "nelson" });
    expect(c.root.children[0]?.strokes).toEqual([1, 2]);
    expect(c.root.children[1]?.strokes).toEqual([3, 4]);
  });

  it("行: element の無いグループも落とさず、深い入れ子を保つ", () => {
    const c = parseKanjiVg(GYOU);
    expect(c.strokes).toHaveLength(6);
    expect(c.root.children).toHaveLength(2);
    const left = c.root.children[0]!;
    expect(left.attrs).toEqual({ element: "彳", position: "left" });
    expect(left.strokes).toEqual([1]);
    expect(left.children[0]?.attrs).toEqual({ element: "亻", variant: "true", original: "人" });
    expect(left.children[0]?.strokes).toEqual([2, 3]);
    const right = c.root.children[1]!;
    expect(right.attrs).toEqual({ position: "right" });
    expect(right.strokes).toEqual([4, 5, 6]);
  });

  it("あ: 型なしの画は type null", () => {
    const c = parseKanjiVg(A);
    expect(c.codepoint).toBe("03042");
    expect(c.strokes.map((s) => s.type)).toEqual([null, null, null]);
    expect(c.root.strokes).toEqual([1, 2, 3]);
    expect(c.root.children).toEqual([]);
    expect(c.numbers).toEqual([[22.51, 35], [41.51, 19], [57.51, 42]]);
  });

  it("画番号の数が画数と違えば投げる", () => {
    expect(() => parseKanjiVg(A.replace('<text transform="matrix(1 0 0 1 57.51 42)">3</text>', ""))).toThrow(/画番号/);
  });
});
