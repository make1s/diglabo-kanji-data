import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { A, GYOU, KA } from "../fixtures/kanjivg-samples.js";
import { buildChar } from "../build/char.js";
import { parseKanjiVg } from "../kanjivg/parse.js";
import { validateProfileTable } from "../profiles/types.js";
import type { RadicalNameTable } from "../build/radical.js";
import { renderGrid, renderRadicalsPage, renderTypesPage } from "./render.js";

const table = validateProfileTable(JSON.parse(readFileSync(new URL("../../data/stroke-profiles.json", import.meta.url), "utf8")));
const radicalNames = JSON.parse(readFileSync(new URL("../../data/radical-names.json", import.meta.url), "utf8")) as RadicalNameTable;
const records = [
  buildChar({ kvg: parseKanjiVg(KA), table, radicalNames, kind: "kanji" }).record,
  buildChar({ kvg: parseKanjiVg(GYOU), table, radicalNames, kind: "kanji" }).record,
  buildChar({ kvg: parseKanjiVg(A), table, radicalNames, kind: "hiragana" }).record,
];

describe("renderGrid", () => {
  it("字ごとに <g data-char> を持つ SVG を返す", () => {
    const svg = renderGrid(records, { columns: 2, cell: 100 });
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.match(/<g data-char="/g)).toHaveLength(3);
    expect(svg).toContain('data-char="化"');
    expect(svg).toMatch(/viewBox="0 0 200 200"/);
    expect((svg.match(/<path /g) ?? []).length).toBe(4 + 6 + 3);
    expect(svg).toContain(">1<");
  });
});

describe("renderTypesPage", () => {
  it("使われた設計図の鍵ごとに見出しと件数とサンプルを出す", () => {
    const html = renderTypesPage(records, table, 8);
    for (const key of ["㇒", "㇑", "㇟", "㇐", "㇚", "kana"]) expect(html).toContain(`data-profile="${key}"`);
    expect(html).toContain("㇒");
    expect(html).toMatch(/㇒[^<]*<[^>]*>[^<]*4 画/);
    expect(html).toContain('fill="#d00"');
  });
});

describe("renderRadicalsPage", () => {
  it("字形と位置ごとに呼び名と部首の画を出す", () => {
    const html = renderRadicalsPage(records, 8);
    // 「化」の部首は伝統部首の匕（画 3・4）。部首の画だけ黒で、残りは灰
    expect(html).toContain("ひ");
    expect(html).toContain("匕・right・1 字");
    expect((html.match(/fill="#000"/g) ?? []).length).toBe(2 + 6);
    expect((html.match(/fill="#bbb"/g) ?? []).length).toBe(2);
    // かなは部首を持たないので出ない
    expect(html).not.toContain("あ");
  });
});
