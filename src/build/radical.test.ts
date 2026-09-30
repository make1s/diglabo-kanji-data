import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildRadical, type RadicalNameTable } from "./radical.js";
import type { PartNode } from "./types.js";

const names: RadicalNameTable = {
  version: 1,
  names: {
    囗: { name: "くにがまえ" },
    木: { name: "き", byPosition: { left: "きへん" } },
    匕: { name: "さじ" },
    又: { name: "また" },
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

describe("呼び名の表（常用漢字）", () => {
  it("常用漢字で新しく出る 34 字形がすべて表にある", () => {
    const names = JSON.parse(readFileSync(new URL("../../data/radical-names.json", import.meta.url), "utf8")) as RadicalNameTable;
    const added = ["彑", "鬯", "虍", "牙", "瓦", "甘", "缶", "韋", "旡", "鬼", "亀", "臼", "匚", "⺗", "鼓", "⺤", "⻞", "釆", "聿", "巛", "斉", "卜", "辶", "爻", "而", "爪", "屮", "髟", "舛", "豸", "麻", "矛", "竜", "隶"];
    for (const el of added) expect(names.names[el], el).toBeDefined();
  });

  it("中学で習う字で位置により呼び名が変わる字形（漢字ペディアと照合）", () => {
    const names = JSON.parse(readFileSync(new URL("../../data/radical-names.json", import.meta.url), "utf8")) as RadicalNameTable;
    expect(names.names["戸"]?.byPosition?.["tare"]).toBe("とだれ"); // 房扇扉
    expect(names.names["立"]?.byPosition?.["left"]).toBe("たつへん"); // 端
    expect(names.names["魚"]?.byPosition?.["left"]).toBe("うおへん"); // 鮮鯨
    expect(names.names["歯"]?.byPosition?.["left"]).toBe("はへん"); // 齢
  });
});

describe("buildRadical の手当て", () => {
  // 「及」は KanjiVG が 丿 に部首の印を付けるが、辞典（漢字ペディア）の部首は 又
  const root = node({
    element: "及",
    strokes: [1, 2, 3],
    children: [node({ element: "丿", radical: "general", strokes: [1] }), node({ element: "又", strokes: [2, 3] })],
  });

  it("手当てがあれば KanjiVG の印より優先し、呼び名は表から引く", () => {
    const got = buildRadical(root, 29, names, "及", { element: "又", strokes: [2, 3], position: null, number: 29 });
    expect(got).toEqual({
      radical: { number: 29, element: "又", position: null, name: "また", strokes: [2, 3], source: "override" },
      warnings: [],
    });
  });

  it("手当てが無ければ今までどおり KanjiVG の印", () => {
    expect(buildRadical(root, 29, names, "及").radical?.element).toBe("丿");
  });
});

describe("部首の手当ての表", () => {
  it("手当ての字はどれも呼び名の表に字形がある", () => {
    const table = JSON.parse(readFileSync(new URL("../../data/radical-names.json", import.meta.url), "utf8")) as RadicalNameTable;
    const overrides = JSON.parse(readFileSync(new URL("../../data/radical-overrides.json", import.meta.url), "utf8")) as { overrides: Record<string, { element: string }> };
    expect(Object.keys(overrides.overrides).sort()).toEqual(["冒", "及", "巨", "舗"].sort());
    for (const o of Object.values(overrides.overrides)) expect(table.names[o.element], o.element).toBeDefined();
  });
});
