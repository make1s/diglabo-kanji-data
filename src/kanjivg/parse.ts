export interface KvgStroke {
  /** 画番号（1 始まり、KanjiVG の書き順） */
  n: number;
  /** kvg:type。無ければ null（かなはほぼ全部無い） */
  type: string | null;
  /** 中心線の path d */
  d: string;
}

/** KanjiVG の <g> 1つ。attrs は kvg: 属性の接頭辞を落としたもの（id と style は含めない） */
export interface KvgGroup {
  attrs: Record<string, string>;
  /** このグループ直下の画番号 */
  strokes: number[];
  children: KvgGroup[];
}

export interface KvgChar {
  codepoint: string;
  strokes: KvgStroke[];
  /** 画番号の表示位置（画番号順） */
  numbers: [number, number][];
  root: KvgGroup;
}

const TAG = /<g\b([^>]*)>|<\/g>|<path\b([^>]*)\/>|<text\b[^>]*transform="matrix\(1 0 0 1 ([-\d.]+) ([-\d.]+)\)"[^>]*>(\d+)<\/text>/g;

function parseAttrs(s: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of s.matchAll(/([\w:-]+)="([^"]*)"/g)) out[m[1]!] = m[2]!;
  return out;
}

function kvgAttrs(all: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(all)) if (k.startsWith("kvg:")) out[k.slice(4)] = v;
  return out;
}

/** KanjiVG の SVG 1ファイルを読む（既定字形のファイルだけを渡すこと） */
export function parseKanjiVg(svg: string): KvgChar {
  const idMatch = svg.match(/id="kvg:StrokePaths_([0-9a-f]+)"/);
  if (!idMatch) throw new Error("kvg:StrokePaths_ が無い");
  const codepoint = idMatch[1]!;
  const strokes: KvgStroke[] = [];
  const numbers: [number, number][] = [];
  type Frame = { group: KvgGroup | null };
  const stack: Frame[] = [];
  let root: KvgGroup | null = null;

  const currentGroup = (): KvgGroup | null => {
    for (let i = stack.length - 1; i >= 0; i--) if (stack[i]!.group) return stack[i]!.group;
    return null;
  };

  for (const m of svg.matchAll(TAG)) {
    const tag = m[0];
    if (tag.startsWith("<g")) {
      const attrs = parseAttrs(m[1] ?? "");
      const id = attrs["id"] ?? "";
      if (id.startsWith("kvg:StrokePaths_") || id.startsWith("kvg:StrokeNumbers_")) {
        stack.push({ group: null });
        continue;
      }
      const group: KvgGroup = { attrs: kvgAttrs(attrs), strokes: [], children: [] };
      const parent = currentGroup();
      if (parent) parent.children.push(group);
      else if (!root) root = group;
      else throw new Error(`root が2つある: ${codepoint}`);
      stack.push({ group });
    } else if (tag === "</g>") {
      stack.pop();
    } else if (tag.startsWith("<path")) {
      const attrs = parseAttrs(m[2] ?? "");
      const n = strokes.length + 1;
      const idN = attrs["id"]?.match(/-s(\d+)$/)?.[1];
      if (idN !== undefined && Number(idN) !== n) throw new Error(`画番号が飛んでいる: ${codepoint} s${idN} を ${n} 番目に読んだ`);
      const d = attrs["d"];
      if (!d) throw new Error(`d が無い: ${codepoint} s${n}`);
      strokes.push({ n, type: attrs["kvg:type"] || null, d });
      const g = currentGroup();
      if (!g) throw new Error(`グループの外に画がある: ${codepoint} s${n}`);
      g.strokes.push(n);
    } else {
      const idx = Number(m[5]) - 1;
      numbers[idx] = [Number(m[3]), Number(m[4])];
    }
  }
  if (!root) throw new Error(`グループが無い: ${codepoint}`);
  if (numbers.length !== strokes.length || numbers.some((p) => p === undefined)) {
    throw new Error(`画番号の数（${numbers.filter(Boolean).length}）が画数（${strokes.length}）と違う: ${codepoint}`);
  }
  return { codepoint, strokes, numbers, root };
}

/** グループに含まれる全画番号（子孫も含む）を昇順で返す */
export function allStrokesOf(group: KvgGroup): number[] {
  const out = [...group.strokes];
  for (const c of group.children) out.push(...allStrokesOf(c));
  return out.sort((a, b) => a - b);
}
