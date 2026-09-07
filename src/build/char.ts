import { bboxOfPoints, unionBBox, type BBox } from "../geometry/bbox.js";
import { buildOutline, simplifyPolyline, toPathD } from "../geometry/outline.js";
import { parseSvgPath } from "../geometry/path.js";
import { sampleCenterline } from "../geometry/sample.js";
import type { KanjidicEntry } from "../kanjidic/parse.js";
import { allStrokesOf, type KvgChar, type KvgGroup } from "../kanjivg/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { resolveProfileKey } from "../profiles/resolve.js";
import type { ProfileTable } from "../profiles/types.js";
import { selectEduReadings, type ReadingOverride } from "../readings/edu.js";
import { buildRadical, type RadicalNameTable } from "./radical.js";
import type { CharKind, CharRecord, PartNode, StrokeRecord } from "./types.js";

export interface BuildInput {
  kvg: KvgChar;
  dic?: KanjidicEntry | undefined;
  mext?: MextEntry | undefined;
  override?: ReadingOverride | undefined;
  table: ProfileTable;
  radicalNames: RadicalNameTable;
  kind: CharKind;
}

const round = (v: number, digits: number): number => Number(v.toFixed(digits));
const roundBBox = (b: BBox): BBox => [round(b[0], 2), round(b[1], 2), round(b[2], 2), round(b[3], 2)];

const STRING_ATTRS = ["element", "original", "position", "radical", "phon"] as const;
const FLAG_ATTRS = ["variant", "partial", "tradForm", "radicalForm"] as const;
const NUMBER_ATTRS = ["part", "number"] as const;

function toPartNode(group: KvgGroup, strokeBBoxes: Map<number, BBox>): PartNode {
  const strokes = allStrokesOf(group);
  const boxes = strokes.map((n) => strokeBBoxes.get(n)).filter((b): b is BBox => b !== undefined);
  const bbox = boxes.length > 0 ? boxes.reduce((acc, b) => unionBBox(acc, b)) : ([0, 0, 0, 0] as BBox);
  const node: PartNode = { strokes, bbox: roundBBox(bbox), children: group.children.map((c) => toPartNode(c, strokeBBoxes)) };
  const ordered: PartNode = {} as PartNode;
  for (const k of STRING_ATTRS) if (group.attrs[k] !== undefined) ordered[k] = group.attrs[k];
  for (const k of FLAG_ATTRS) if (group.attrs[k] === "true") ordered[k] = true;
  for (const k of NUMBER_ATTRS) if (group.attrs[k] !== undefined) ordered[k] = Number(group.attrs[k]);
  ordered.strokes = node.strokes;
  ordered.bbox = node.bbox;
  ordered.children = node.children;
  return ordered;
}

const EMPTY_DIC = (char: string, codepoint: string): KanjidicEntry => ({ char, codepoint, grade: null, strokeCount: 0, radicalClassical: null, on: [], kun: [], meanings: [] });

/** KanjiVG 1字と辞書・割り振り表から CharRecord を組む。幾何は設計図の表だけで決まり、字ごとの上書きは無い */
export function buildChar(input: BuildInput): { record: CharRecord; warnings: string[] } {
  const { kvg, table, kind } = input;
  const char = String.fromCodePoint(Number.parseInt(kvg.codepoint, 16));
  const warnings: string[] = [];
  const dic = input.dic ?? EMPTY_DIC(char, kvg.codepoint);

  const strokeBBoxes = new Map<number, BBox>();
  const strokes: StrokeRecord[] = kvg.strokes.map((s, i) => {
    const sampled = sampleCenterline(parseSvgPath(s.d));
    const profileKey = resolveProfileKey(s.type, table);
    const poly = simplifyPolyline(buildOutline(sampled, table.profiles[profileKey]!, table.stemWidth));
    const bbox = roundBBox(bboxOfPoints(poly));
    strokeBBoxes.set(s.n, bbox);
    const numberAt = kvg.numbers[i]!;
    return { n: s.n, type: s.type, profile: profileKey, centerline: s.d, outline: toPathD(poly), length: round(sampled.length, 1), numberAt, bbox };
  });

  if (input.dic && input.dic.strokeCount !== strokes.length) warnings.push(`${char}: 画数が違う（KanjiVG ${strokes.length}・KANJIDIC2 ${input.dic.strokeCount}）`);
  if (kind === "kanji" && !input.mext) warnings.push(`${char}: 割り振り表に無い`);
  if (input.dic && input.mext && input.dic.grade !== input.mext.grade) warnings.push(`${char}: 学年が違う（KANJIDIC2 ${input.dic.grade}・割り振り表 ${input.mext.grade}）`);
  const edu = selectEduReadings(dic, input.mext, input.override);
  for (const u of edu.unmatched) warnings.push(`${char}: 教育用読み「${u}」を KANJIDIC2 の表記に写せない（data/edu-readings-overrides.json で手当て）`);

  const parts = toPartNode(kvg.root, strokeBBoxes);
  const rad = buildRadical(parts, dic.radicalClassical, input.radicalNames, char);
  warnings.push(...rad.warnings);

  const record: CharRecord = {
    char,
    codepoint: kvg.codepoint,
    kind,
    grade: dic.grade,
    strokeCount: strokes.length,
    radical: rad.radical,
    readings: { on: [...dic.on], kun: [...dic.kun] },
    eduReadings: { on: edu.on, kun: edu.kun },
    eduReadingsSpecial: edu.special,
    meanings: [...dic.meanings],
    viewBox: [0, 0, 109, 109],
    strokes,
    parts,
  };
  return { record, warnings };
}
