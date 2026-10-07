import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { filterCharacters, KanjiError, listParts, lookupCharacter, renderCharacter } from "../src/index.js";
import type { CharacterIndex, DatasetManifest, Glyph, RenderOptions } from "../src/types.js";
const root = new URL("../../../", import.meta.url);
const manifest: DatasetManifest = { schemaVersion: 1, datasetVersion: "0.6.5", profilesVersion: 4, license: "CC-BY-SA-4.0", sources: [{ name: "KanjiVG", url: "https://kanjivg.tagaini.net/", license: "CC-BY-SA-3.0", version: "r20250816" }] };
const glyph = (char: string): Glyph => ({ manifest, record: JSON.parse(readFileSync(new URL(`dist/chars/${char.codePointAt(0)!.toString(16).padStart(5, "0")}.json`, root), "utf8")) as Glyph["record"] });
const rawIndex = JSON.parse(readFileSync(new URL("dist/index.json", root), "utf8")) as { chars: CharacterIndex["chars"] };
const index: CharacterIndex = { manifest, chars: rawIndex.chars };
const paths = (svg: string): string[] => svg.match(/<path\b[^>]*\/>/gu) ?? [];
function error(action: () => unknown, code: string): void {
  try { action(); throw new Error("エラーが返りませんでした"); } catch (e) { expect(e).toBeInstanceOf(KanjiError); expect((e as KanjiError).code).toBe(code); }
}
describe("公開APIから教材を作る", () => {
  it("同じ文字データから同じ手本と、版・帰属を返す", () => {
    const source = glyph("永");
    const before = JSON.stringify(source);
    const result = renderCharacter(source);
    expect(result).toEqual(renderCharacter(source));
    expect(paths(result.svg)).toHaveLength(source.record.strokeCount);
    for (const stroke of source.record.strokes) expect(result.svg).toContain(`d="${stroke.outline}"`);
    expect(result.svg).toContain('role="img" aria-label="永の手本"');
    expect(result.attribution.datasetVersion).toBe("0.6.5");
    expect(result.attribution.text).toContain("KanjiVG");
    expect(JSON.stringify(source)).toBe(before);
  });
  it("0画・途中・全画を表示し、画の重なり順を維持する", () => {
    const source = glyph("休");
    expect(paths(renderCharacter(source, { visibleStrokes: 0 }).svg)).toHaveLength(0);
    const partial = paths(renderCharacter(source, { visibleStrokes: 3 }).svg);
    expect(partial.map((p) => /data-stroke="(\d+)"/u.exec(p)?.[1])).toEqual(["1", "2", "3"]);
    expect(paths(renderCharacter(source).svg)).toHaveLength(source.record.strokeCount);
  });
  it("林の二つの木を別に選び、親子の指定は和集合になる", () => {
    const source = glyph("林");
    const parts = listParts(source);
    const wood = parts.filter((p) => p.element === "木");
    expect(wood).toHaveLength(2);
    expect(wood[0]!.id).not.toBe(wood[1]!.id);
    const selected = paths(renderCharacter(source, { highlightPartIds: [wood[0]!.id] }).svg).filter((p) => p.includes('fill="#d33"'));
    expect(selected).toHaveLength(wood[0]!.strokes.length);
    const union = paths(renderCharacter(source, { highlightPartIds: [parts[0]!.id, wood[0]!.id] }).svg);
    expect(union.every((p) => p.includes('fill="#d33"'))).toBe(true);
    error(() => renderCharacter(glyph("森"), { highlightPartIds: [wood[0]!.id] }), "UNKNOWN_PART");
    error(() => renderCharacter({ ...source, manifest: { ...manifest, datasetVersion: "0.6.6" } }, { highlightPartIds: [wood[0]!.id] }), "UNKNOWN_PART");
  });
  it("XMLのタイトルをエスケープし、輪郭や色から注入させない", () => {
    const source = glyph("あ");
    const svg = renderCharacter(source, { title: '\"><script>alert(1)</script>&' }).svg;
    expect(svg).not.toContain("<script>");
    expect(svg).toContain("&lt;script&gt;");
    error(() => renderCharacter(source, { color: 'red" onload="alert(1)' }), "INVALID_OPTIONS");
    const bad = structuredClone(source) as unknown as { record: { strokes: { outline: string }[] } };
    bad.record.strokes[0]!.outline = '\"/><script>alert(1)</script>';
    error(() => renderCharacter(bad as unknown as Glyph), "INVALID_DATA");
  });
  it.each([{ size: 0 }, { size: Infinity }, { size: null }, { visibleStrokes: -1 }, { visibleStrokes: 1.5 }, { visibleStrokes: 100 }, { highlightPartIds: "木" }, { color: "url(https://example.com)" }, { title: "\u0000" }, { onclick: "alert(1)" }])("不正なオプションを明確に拒否する: %j", (option) => {
    error(() => renderCharacter(glyph("休"), option as unknown as RenderOptions), "INVALID_OPTIONS");
  });
  it("欠けたデータ・循環・未対応schemaを拒否する", () => {
    error(() => renderCharacter(null as unknown as Glyph), "INVALID_DATA");
    error(() => renderCharacter({ record: {} } as Glyph), "INVALID_DATA");
    error(() => listParts({ ...glyph("休"), manifest: { ...manifest, schemaVersion: 2 } }), "UNSUPPORTED_SCHEMA");
    const cyclic = structuredClone(glyph("休"));
    (cyclic.record.parts.children as unknown[]).push(cyclic.record.parts);
    error(() => listParts(cyclic), "INVALID_DATA");
  });
  it("文字検索は補助漢字・かなの正規化・未対応・複数入力を区別する", () => {
    expect(lookupCharacter(index, "𠮟").status).toBe("found");
    expect(lookupCharacter(index, "か\u3099")).toMatchObject({ status: "found", entry: { char: "が" } });
    expect(lookupCharacter(index, "😀")).toEqual({ status: "unsupported", input: "😀" });
    expect(lookupCharacter(index, "休林").status).toBe("invalid-input");
    expect(lookupCharacter(index, "").status).toBe("invalid-input");
    expect(lookupCharacter(index, "叱").status).toBe("unsupported");
    error(() => lookupCharacter({ ...index, manifest: { ...manifest, schemaVersion: 2 } }, "休"), "UNSUPPORTED_SCHEMA");
  });
  it("学年と文字種を絞り込み、かなを中学生向けと解釈しない", () => {
    const second = filterCharacters(index, { grade: 2 });
    expect(second).toHaveLength(160);
    expect(second.every((c) => c.grade === 2 && c.kind === "kanji")).toBe(true);
    expect(filterCharacters(index, { kind: "hiragana" })).toHaveLength(86);
    expect(filterCharacters(index)).toHaveLength(2313);
    error(() => filterCharacters(index, { grade: 8 }), "INVALID_OPTIONS");
  });
});
