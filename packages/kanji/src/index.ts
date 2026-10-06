/*! Copyright (c) 2026 make1s. SPDX-License-Identifier: MIT */
import type { Attribution, CharacterFilter, CharacterIndex, CharacterSummary, Glyph, LookupResult, PartInfo, PartNode, RenderOptions, RenderResult } from "./types.js";
import { check, object, text, validateGlyph, validateIndex } from "./validate.js";
export type * from "./types.js";
export { KanjiError } from "./validate.js";
export type { KanjiErrorCode } from "./validate.js";

function partsOf(glyph: Glyph): PartInfo[] {
  const out: PartInfo[] = [];
  const prefix = `${glyph.manifest.datasetVersion}:${glyph.record.codepoint}`;
  function walk(node: PartNode, path: string, parentId: string | null): void {
    const id = `${prefix}:${path}`;
    out.push({ id, parentId, element: node.element ?? null, original: node.original ?? null, strokes: [...node.strokes] });
    node.children.forEach((child, i) => walk(child, `${path}.${i}`, id));
  }
  walk(glyph.record.parts, "p", null);
  return out;
}
export function listParts(glyph: Glyph): readonly PartInfo[] {
  validateGlyph(glyph);
  return partsOf(glyph);
}
const xml = (value: string): string => value.replace(/[&<>"']/gu, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const color = (v: unknown): v is string => typeof v === "string" && /^(?:currentColor|#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8}))$/iu.test(v);

export function renderCharacter(glyph: Glyph, options: RenderOptions = {}): RenderResult {
  validateGlyph(glyph);
  check(object(options as unknown) && Object.values(options).every((v) => v !== null) && Object.keys(options).every((k) => ["size", "visibleStrokes", "color", "highlightPartIds", "highlightColor", "title"].includes(k)), "描画オプションが不正です", "INVALID_OPTIONS");
  const size = options.size ?? 128;
  const visible = options.visibleStrokes ?? glyph.record.strokeCount;
  const fill = options.color ?? "currentColor";
  const highlight = options.highlightColor ?? "#d33";
  const ids = options.highlightPartIds ?? [];
  const title = options.title ?? `${glyph.record.char}の手本`;
  check(typeof size === "number" && Number.isFinite(size) && size > 0, "sizeは正の有限数です", "INVALID_OPTIONS");
  check(Number.isInteger(visible) && visible >= 0 && visible <= glyph.record.strokeCount, "visibleStrokesは0〜画数の整数です", "INVALID_OPTIONS");
  check(color(fill) && color(highlight) && text(title) && Array.isArray(ids) && ids.every((id) => typeof id === "string"), "色・タイトル・部品指定が不正です", "INVALID_OPTIONS");
  const parts = new Map(partsOf(glyph).map((p) => [p.id, p]));
  const strokes = new Set<number>();
  for (const id of ids) {
    const part = parts.get(id);
    check(part, `部品が見つかりません: ${id}`, "UNKNOWN_PART");
    part.strokes.forEach((n) => strokes.add(n));
  }
  const sources = glyph.manifest.sources.map((s) => ({ ...s }));
  const attribution: Attribution = {
    text: `${sources.map((s) => `${s.name} (${s.license})`).join(" / ")} / データ ${glyph.manifest.datasetVersion} (${glyph.manifest.license})`,
    license: glyph.manifest.license, datasetVersion: glyph.manifest.datasetVersion, sources,
  };
  const paths = glyph.record.strokes.slice(0, visible).map((s) => `<path data-stroke="${s.n}" fill="${strokes.has(s.n) ? highlight : fill}" d="${xml(s.outline)}"/>`).join("");
  return { svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 109 109" role="img" aria-label="${xml(title)}"><title>${xml(title)}</title><metadata>${xml(JSON.stringify(attribution))}</metadata>${paths}</svg>`, attribution };
}
export function lookupCharacter(index: CharacterIndex, input: string): LookupResult {
  validateIndex(index);
  check(typeof input === "string", "inputは文字列です", "INVALID_OPTIONS");
  const normalized = input.normalize("NFC");
  if (!text(normalized) || Array.from(normalized).length !== 1) return { status: "invalid-input", input };
  const entry = index.chars.find((c) => c.char === normalized);
  return entry ? { status: "found", entry } : { status: "unsupported", input: normalized };
}
export function filterCharacters(index: CharacterIndex, filter: CharacterFilter = {}): readonly CharacterSummary[] {
  validateIndex(index);
  check(object(filter as unknown) && Object.keys(filter).every((k) => k === "grade" || k === "kind"), "絞り込み条件が不正です", "INVALID_OPTIONS");
  check(filter.grade === undefined || (Number.isInteger(filter.grade) && filter.grade >= 1 && filter.grade <= 6), "gradeは1〜6です", "INVALID_OPTIONS");
  check(filter.kind === undefined || ["kanji", "hiragana", "katakana"].includes(filter.kind), "kindが不正です", "INVALID_OPTIONS");
  return index.chars.filter((c) => (filter.grade === undefined || c.grade === filter.grade) && (filter.kind === undefined || c.kind === filter.kind));
}
