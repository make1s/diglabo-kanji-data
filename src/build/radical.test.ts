import { describe, expect, it } from "vitest";
import { buildRadical, type RadicalNameTable } from "./radical.js";
import type { PartNode } from "./types.js";

const names: RadicalNameTable = {
  version: 1,
  names: {
    囗: { name: "くにがまえ" },
    木: { name: "き", byPosition: { left: "きへん" } },
    匕: { name: "さじ" },
  },
};

const node = (o: Partial<PartNode>): PartNode => ({ strokes: [], bbox: [0, 0, 0, 0], children: [], ...o });

describe("buildRadical", () => {
  it("囲む部首が 2 つのグループに分かれていても画を合わせる", () => {
    // 「四」の囗は 上の 2 画 と 最後に閉じる 1 画 が別のグループになっている
    const root = node({
      element: "四",
      strokes: [1, 2, 3, 4, 5],
      children: [
        node({ element: "囗", radical: "general", position: "kamae", strokes: [1, 2] }),
        node({ element: "儿", strokes: [3, 4] }),
        node({ element: "囗", radical: "general", strokes: [5] }),
      ],
    });
    expect(buildRadical(root, 31, names, "四").radical).toEqual({
      number: 31, element: "囗", position: "kamae", name: "くにがまえ", strokes: [1, 2, 5], source: "general",
    });
  });

  it("general が無ければ伝統部首に落ちる", () => {
    const root = node({
      element: "化",
      strokes: [1, 2, 3, 4],
      children: [
        node({ element: "亻", radical: "nelson", position: "left", strokes: [1, 2] }),
        node({ element: "匕", radical: "tradit", position: "right", strokes: [3, 4] }),
      ],
    });
    const { radical } = buildRadical(root, 21, names, "化");
    expect(radical?.element).toBe("匕");
    expect(radical?.source).toBe("tradit");
  });

  it("位置で呼び名を分ける", () => {
    const left = node({ element: "木", radical: "general", position: "left", strokes: [1, 2, 3, 4] });
    const bottom = node({ element: "木", radical: "general", position: "bottom", strokes: [1, 2, 3, 4] });
    expect(buildRadical(node({ children: [left], strokes: [1, 2, 3, 4] }), 75, names, "桜").radical?.name).toBe("きへん");
    expect(buildRadical(node({ children: [bottom], strokes: [1, 2, 3, 4] }), 75, names, "染").radical?.name).toBe("き");
  });

  it("表に無い字形は呼び名 null と警告", () => {
    const root = node({ children: [node({ element: "鼻", radical: "general", strokes: [1] })], strokes: [1] });
    const out = buildRadical(root, 209, names, "鼻");
    expect(out.radical?.name).toBeNull();
    expect(out.warnings).toHaveLength(1);
  });

  it("かなは部首を持たず警告も出さない", () => {
    const out = buildRadical(node({ element: "あ", strokes: [1, 2, 3] }), null, names, "あ");
    expect(out.radical).toBeNull();
    expect(out.warnings).toEqual([]);
  });
});
