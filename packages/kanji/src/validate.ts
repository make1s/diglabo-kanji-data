/*! Copyright (c) 2026 make1s. SPDX-License-Identifier: MIT */
import type { CharacterIndex, Glyph, DatasetManifest } from "./types.js";

export type KanjiErrorCode = "INVALID_DATA" | "UNSUPPORTED_SCHEMA" | "INVALID_OPTIONS" | "UNKNOWN_PART";
export class KanjiError extends Error {
  override readonly name = "KanjiError";
  constructor(readonly code: KanjiErrorCode, message: string) { super(message); }
}
export function check(condition: unknown, message: string, code: KanjiErrorCode = "INVALID_DATA"): asserts condition {
  if (!condition) throw new KanjiError(code, message);
}
export function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
export function text(value: unknown): value is string {
  return typeof value === "string" && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/u.test(value)
    && !Array.from(value).some((c) => { const n = c.codePointAt(0)!; return n >= 0xd800 && n <= 0xdfff; });
}
const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const integer = (v: unknown): v is number => finite(v) && Number.isInteger(v);
const texts = (v: unknown): boolean => Array.isArray(v) && v.every(text);
const tuple = (v: unknown, n: number): boolean => Array.isArray(v) && v.length === n && v.every(finite);
const bbox = (v: unknown): boolean => tuple(v, 4) && (v as number[])[2]! >= 0 && (v as number[])[3]! >= 0;
const kind = (v: unknown): boolean => v === "kanji" || v === "hiragana" || v === "katakana";
const grade = (v: unknown): boolean => v === null || (integer(v) && v >= 1 && v <= 6);
const readings = (v: unknown): boolean => object(v) && texts(v.on) && texts(v.kun);
function summary(v: unknown): asserts v is Record<string, unknown> {
  check(object(v), "文字の要約がオブジェクトではありません");
  check(text(v.char) && Array.from(v.char).length === 1, "charはUnicodeの一文字です");
  check(v.codepoint === v.char.codePointAt(0)!.toString(16).padStart(5, "0"), "codepointが文字と一致しません");
  check(kind(v.kind) && grade(v.grade) && integer(v.strokeCount) && v.strokeCount > 0, "文字の種別・学年・画数が不正です");
}
export function validateManifest(v: unknown): asserts v is DatasetManifest {
  check(object(v) && integer(v.schemaVersion), "manifestが不正です");
  check(v.schemaVersion === 1, `未対応のschemaVersion: ${v.schemaVersion}`, "UNSUPPORTED_SCHEMA");
  check(text(v.datasetVersion) && v.datasetVersion.length > 0 && integer(v.profilesVersion) && v.profilesVersion >= 1 && text(v.license) && v.license.length > 0, "manifestの版・ライセンスが不正です");
  check(Array.isArray(v.sources) && v.sources.length > 0, "出典がありません");
  for (const s of v.sources) {
    check(object(s) && text(s.name) && s.name.length > 0 && text(s.license) && s.license.length > 0 && text(s.version) && text(s.url) && /^https?:\/\/\S+$/u.test(s.url), "出典の名前・URL・ライセンス・版が不正です");
  }
}
export function validateIndex(v: unknown): asserts v is CharacterIndex {
  check(object(v), "索引がオブジェクトではありません");
  validateManifest(v.manifest);
  check(Array.isArray(v.chars), "索引の文字一覧がありません");
  const seen = new Set<string>();
  for (const item of v.chars) {
    summary(item);
    check(!seen.has(item.char as string), "索引に重複した文字があります");
    seen.add(item.char as string);
  }
}
export function validateGlyph(v: unknown): asserts v is Glyph {
  check(object(v), "文字データがオブジェクトではありません");
  validateManifest(v.manifest);
  const r = v.record;
  summary(r);
  const count = r.strokeCount as number;
  check(tuple(r.viewBox, 4) && (r.viewBox as number[]).every((n, i) => n === [0, 0, 109, 109][i]), "viewBoxが不正です");
  check(readings(r.readings) && readings(r.eduReadings) && texts(r.eduReadingsSpecial) && texts(r.meanings) && texts(r.variants), "読み・意味・異体字が不正です");
  check(object(r.readingStages), "読みの段階がありません");
  for (const key of ["on", "kun"]) {
    const items = r.readingStages[key];
    check(Array.isArray(items) && items.every((s: unknown) => object(s) && text(s.reading) && ["elementary", "junior", "senior"].includes(s.stage as string)), "読みの段階が不正です");
  }
  const strokeNumbers = (value: unknown): value is number[] => Array.isArray(value)
    && value.every((n) => integer(n) && n >= 1 && n <= count) && new Set(value).size === value.length;
  check(Array.isArray(r.strokes) && r.strokes.length === count, "画数と画の一覧が一致しません");
  for (const [i, s] of r.strokes.entries()) {
    check(object(s) && s.n === i + 1 && (s.type === null || text(s.type)) && text(s.profile) && text(s.centerline)
      && text(s.outline) && /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]+$/u.test(s.outline)
      && (s.outline.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/gu) ?? []).every((n) => Number.isFinite(Number(n)))
      && finite(s.length) && s.length >= 0 && tuple(s.numberAt, 2) && bbox(s.bbox), "画の番号・輪郭・座標が不正です");
  }
  if (r.radical !== null) {
    const d = r.radical;
    check(object(d) && (d.number === null || (integer(d.number) && d.number >= 1 && d.number <= 214)) && text(d.element)
      && (d.position === null || text(d.position)) && (d.name === null || text(d.name)) && strokeNumbers(d.strokes)
      && ["general", "tradit", "nelson", "override"].includes(d.source as string), "部首が不正です");
  }
  const seen = new Set<object>();
  function visit(node: unknown, depth: number, parent?: readonly number[]): void {
    check(object(node) && depth <= 64 && !seen.has(node), "部品階層が不正です");
    seen.add(node);
    check(strokeNumbers(node.strokes) && bbox(node.bbox) && Array.isArray(node.children), "部品の画番号・座標・子部品が不正です");
    check(parent === undefined || node.strokes.every((n) => parent.includes(n)), "子部品が親にない画を含んでいます");
    for (const key of ["element", "original", "position", "radical", "phon"]) check(node[key] === undefined || text(node[key]), "部品名が不正です");
    for (const key of ["variant", "partial", "tradForm", "radicalForm"]) check(node[key] === undefined || node[key] === true, "部品の属性が不正です");
    for (const key of ["part", "number"]) check(node[key] === undefined || integer(node[key]), "部品の番号が不正です");
    for (const child of node.children) visit(child, depth + 1, node.strokes);
  }
  visit(r.parts, 0);
  check(object(r.parts) && Array.isArray(r.parts.strokes) && r.parts.strokes.length === count, "文字全体の部品に画が不足しています");
}
