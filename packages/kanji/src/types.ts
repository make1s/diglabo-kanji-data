/** 公開するデータ契約。両パッケージに自己完結する型として配布する。 */
export type CharacterKind = "kanji" | "hiragana" | "katakana";
export type BBox = readonly [number, number, number, number];
export interface StrokeRecord {
  readonly n: number;
  readonly type: string | null;
  readonly profile: string;
  readonly centerline: string;
  readonly outline: string;
  readonly length: number;
  readonly numberAt: readonly [number, number];
  readonly bbox: BBox;
}
export interface PartNode {
  readonly element?: string;
  readonly original?: string;
  readonly variant?: true;
  readonly position?: string;
  readonly radical?: string;
  readonly phon?: string;
  readonly part?: number;
  readonly number?: number;
  readonly partial?: true;
  readonly tradForm?: true;
  readonly radicalForm?: true;
  readonly strokes: readonly number[];
  readonly bbox: BBox;
  readonly children: readonly PartNode[];
}
export interface RadicalRecord {
  readonly number: number | null;
  readonly element: string;
  readonly position: string | null;
  readonly name: string | null;
  readonly strokes: readonly number[];
  readonly source: "general" | "tradit" | "nelson" | "override";
}
export interface Readings { readonly on: readonly string[]; readonly kun: readonly string[] }
export interface StagedReading { readonly reading: string; readonly stage: "elementary" | "junior" | "senior" }
export interface CharacterRecord {
  readonly char: string;
  readonly codepoint: string;
  readonly kind: CharacterKind;
  readonly grade: number | null;
  readonly strokeCount: number;
  readonly radical: RadicalRecord | null;
  readonly readings: Readings;
  readonly eduReadings: Readings;
  readonly eduReadingsSpecial: readonly string[];
  readonly readingStages: { readonly on: readonly StagedReading[]; readonly kun: readonly StagedReading[] };
  readonly meanings: readonly string[];
  readonly variants: readonly string[];
  readonly viewBox: readonly [0, 0, 109, 109];
  readonly strokes: readonly StrokeRecord[];
  readonly parts: PartNode;
}
export interface DataSource {
  readonly name: string;
  readonly url: string;
  readonly license: string;
  readonly version: string;
}
export interface DatasetManifest {
  readonly schemaVersion: number;
  readonly datasetVersion: string;
  readonly profilesVersion: number;
  readonly license: string;
  readonly sources: readonly DataSource[];
}
export interface Glyph { readonly record: CharacterRecord; readonly manifest: DatasetManifest }
export interface CharacterSummary {
  readonly char: string;
  readonly codepoint: string;
  readonly kind: CharacterKind;
  readonly grade: number | null;
  readonly strokeCount: number;
}
export interface CharacterIndex { readonly manifest: DatasetManifest; readonly chars: readonly CharacterSummary[] }
export interface PartInfo {
  readonly id: string;
  readonly parentId: string | null;
  readonly element: string | null;
  readonly original: string | null;
  readonly strokes: readonly number[];
}
export interface RenderOptions {
  readonly size?: number;
  readonly visibleStrokes?: number;
  readonly color?: string;
  readonly highlightPartIds?: readonly string[];
  readonly highlightColor?: string;
  readonly title?: string;
}
export interface Attribution {
  readonly text: string;
  readonly license: string;
  readonly datasetVersion: string;
  readonly sources: readonly DataSource[];
}
export interface RenderResult { readonly svg: string; readonly attribution: Attribution }
export type LookupResult =
  | { readonly status: "found"; readonly entry: CharacterSummary }
  | { readonly status: "unsupported"; readonly input: string }
  | { readonly status: "invalid-input"; readonly input: string };
export interface CharacterFilter { readonly grade?: number; readonly kind?: CharacterKind }
