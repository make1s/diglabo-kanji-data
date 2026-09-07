/**
 * 部首。KanjiVG の部品階層から「その字のどこが部首か」を取り出し、呼び名を重ねる。
 *
 * KANJIDIC2 が持つのは康熙番号だけなので、紙面に出す 字形（「木」）・位置・画番号 は
 * KanjiVG の印から取り、日本語の呼び名（「きへん」）は data/radical-names.json で与える。
 */
import type { PartNode, RadicalRecord } from "./types.js";

export interface RadicalNameEntry {
  /** 既定の呼び名 */
  name: string;
  /** 位置で呼び分ける字形だけ持つ（木＝き、左に来たら きへん） */
  byPosition?: Record<string, string>;
  /**
   * 同じ字形でも辞典の部首が分かれる字形の上書き。鍵は KANJIDIC2 の康熙番号。
   * 「月」は月部（74・服）と肉部（130・肺）に分かれ、呼び名も つきへん／にくづき と変わる。
   */
  byNumber?: Record<string, { name: string; byPosition?: Record<string, string> }>;
}

export interface RadicalNameTable {
  version: number;
  names: Record<string, RadicalNameEntry>;
}

/** general＝その字の部首。持たない字（「七」「乱」など）は伝統部首に落とす */
const SOURCE_ORDER = ["general", "tradit", "nelson"] as const;
type RadicalSource = (typeof SOURCE_ORDER)[number];

/**
 * 同じ印のついた部品を全部集める。
 * ⚠ 部首は 1 つの部品とは限らない。囲む部首は書き順の都合で分かれていて（「四」の囗は
 * 上の 2 画と最後に閉じる 1 画が別のグループ）、教育漢字では 38 字がこの形。
 * 1 つ目だけ拾うと閉じの画が部首から漏れる。
 */
function findRadicalParts(root: PartNode): { parts: PartNode[]; source: RadicalSource } | null {
  const found = new Map<string, PartNode[]>();
  const walk = (node: PartNode): void => {
    if (node.radical !== undefined) {
      const list = found.get(node.radical);
      if (list) list.push(node);
      else found.set(node.radical, [node]);
    }
    for (const child of node.children) walk(child);
  };
  walk(root);
  for (const source of SOURCE_ORDER) {
    const parts = found.get(source);
    if (parts) return { parts, source };
  }
  return null;
}

export function buildRadical(
  root: PartNode,
  number: number | null,
  names: RadicalNameTable,
  char: string
): { radical: RadicalRecord | null; warnings: string[] } {
  const hit = findRadicalParts(root);
  // かなは部首を持たない。漢字で印が無ければ紙面の部首欄が組めないので警告する
  if (!hit) return { radical: null, warnings: number === null ? [] : [`${char}: KanjiVG に部首の印が無い`] };

  const head = hit.parts[0]!;
  const element = head.element ?? head.original;
  if (element === undefined) return { radical: null, warnings: [`${char}: 部首の部品に字形が無い`] };

  // 字形の違う部品に同じ印が付くことは教育漢字には無いが、混ざったら合わせずに 1 つ目だけ使う
  const same = hit.parts.filter((part) => (part.element ?? part.original) === element);
  const strokes = [...new Set(same.flatMap((part) => part.strokes))].sort((a, b) => a - b);
  const position = head.position ?? null;
  const entry = names.names[element];
  // 康熙番号での上書き（月部／肉部）があればそちらを使う
  const spec = entry === undefined ? undefined : (number === null ? undefined : entry.byNumber?.[String(number)]) ?? entry;
  const name = spec === undefined ? null : (position === null ? undefined : spec.byPosition?.[position]) ?? spec.name;
  const warnings =
    entry === undefined ? [`${char}: 部首「${element}」の呼び名が data/radical-names.json に無い`] : [];

  return {
    radical: { number, element, position, name, strokes, source: hit.source },
    warnings,
  };
}
