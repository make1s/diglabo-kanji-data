/**
 * 目視用の一覧。段2の関門「1,026 字を1枚に並べた一覧をマスターが目視して OK」のための出力で、データセットには入らない。
 * - overview-kanji: 学年順の格子（アウトライン＋画番号＋学年）
 * - overview-kana: かなの格子
 * - overview-types: 設計図の鍵ごとに件数とサンプル（当該の画を赤）。設計図を直す判断はここで行う
 */
import type { CharRecord } from "../build/types.js";
import type { ProfileTable } from "../profiles/types.js";

export interface GridOptions {
  columns: number;
  cell: number;
  showNumbers?: boolean;
  label?: (r: CharRecord) => string;
}

const esc = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

/**
 * 1字を 109 単位系のまま描く <g>。
 * highlight を渡すとその鍵の画だけ赤、dimNonRadical を渡すと部首の画だけ黒（紙面の部首欄と同じ見え方）。
 */
export function renderGlyph(
  r: CharRecord,
  opts: { showNumbers?: boolean; highlight?: string; muted?: string; dimNonRadical?: boolean } = {}
): string {
  const radical = opts.dimNonRadical ? new Set(r.radical?.strokes ?? []) : null;
  const parts: string[] = [`<g data-char="${esc(r.char)}">`];
  for (const s of r.strokes) {
    const fill =
      radical !== null
        ? radical.has(s.n)
          ? "#000"
          : (opts.muted ?? "#bbb")
        : opts.highlight === undefined
          ? "#000"
          : s.profile === opts.highlight
            ? "#d00"
            : (opts.muted ?? "#bbb");
    parts.push(`<path d="${s.outline}" fill="${fill}"/>`);
  }
  if (opts.showNumbers) {
    for (const s of r.strokes) parts.push(`<text x="${s.numberAt[0]}" y="${s.numberAt[1]}" font-size="7" fill="#888" font-family="Arial, Helvetica, sans-serif">${s.n}</text>`);
  }
  parts.push("</g>");
  return parts.join("");
}

/** 格子の SVG。1マス cell px、字は 109 単位を cell×0.86 に縮める */
export function renderGrid(records: CharRecord[], opts: GridOptions): string {
  const { columns, cell } = opts;
  const rows = Math.ceil(records.length / columns);
  const scale = (cell * 0.86) / 109;
  const pad = cell * 0.07;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cell}" height="${rows * cell}" viewBox="0 0 ${columns * cell} ${rows * cell}">`,
    `<rect width="100%" height="100%" fill="#fff"/>`,
  ];
  records.forEach((r, i) => {
    const x = (i % columns) * cell;
    const y = Math.floor(i / columns) * cell;
    out.push(`<g transform="translate(${x + pad},${y + pad}) scale(${scale.toFixed(4)})">${renderGlyph(r, { showNumbers: opts.showNumbers ?? true })}</g>`);
    const label = opts.label?.(r);
    if (label) out.push(`<text x="${x + 3}" y="${y + cell * 0.1}" font-size="${(cell * 0.09).toFixed(1)}" fill="#999" font-family="Arial, Helvetica, sans-serif">${esc(label)}</text>`);
  });
  out.push("</svg>");
  return out.join("\n");
}

export function wrapHtml(title: string, body: string): string {
  return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>body{margin:16px;font-family:sans-serif;background:#fff;color:#222}svg{max-width:100%;height:auto}h2{margin:24px 0 4px;font-size:18px}small{color:#666;font-weight:normal}.samples{display:flex;flex-wrap:wrap;gap:6px}.samples svg{width:120px;height:120px;border:1px solid #eee}pre{font-size:11px;color:#555;background:#f6f6f6;padding:6px;overflow:auto}</style>
</head><body>${body}</body></html>
`;
}

/** 設計図の鍵ごとのサンプル頁 */
export function renderTypesPage(records: CharRecord[], table: ProfileTable, samplesPerType: number): string {
  const byKey = new Map<string, { count: number; chars: Set<string>; samples: CharRecord[] }>();
  for (const r of records) {
    for (const s of r.strokes) {
      const e = byKey.get(s.profile) ?? { count: 0, chars: new Set<string>(), samples: [] };
      e.count++;
      if (!e.chars.has(r.char)) {
        e.chars.add(r.char);
        if (e.samples.length < samplesPerType) e.samples.push(r);
      }
      byKey.set(s.profile, e);
    }
  }
  const keys = [...byKey.keys()].sort((a, b) => byKey.get(b)!.count - byKey.get(a)!.count);
  const sections = keys.map((key) => {
    const e = byKey.get(key)!;
    const samples = e.samples
      .map((r) => `<svg viewBox="-4 -4 117 117" xmlns="http://www.w3.org/2000/svg">${renderGlyph(r, { highlight: key, showNumbers: false })}</svg>`)
      .join("");
    const profile = table.profiles[key];
    return `<section data-profile="${esc(key)}"><h2>${esc(key)} <small>${e.count} 画・${e.chars.size} 字</small></h2><div class="samples">${samples}</div><pre>${esc(JSON.stringify(profile))}</pre></section>`;
  });
  const head = `<h1>設計図の鍵ごとのサンプル</h1><p>stemWidth ${table.stemWidth}・鍵 ${keys.length} 種・赤がその鍵の画。見た目が変な画種は data/stroke-profiles.json の設計図を直す（字ごとの上書きは持たない）。</p>`;
  return wrapHtml("画種別サンプル", head + sections.join("\n"));
}

/**
 * 部首の呼び名と「どの画が部首か」の一覧。
 * 呼び名 data/radical-names.json は出典を持たない自前の表なので、ここを目視して直す。
 */
export function renderRadicalsPage(records: CharRecord[], samplesPer: number): string {
  const groups = new Map<string, { element: string; position: string | null; name: string | null; chars: CharRecord[] }>();
  for (const r of records) {
    if (!r.radical) continue;
    // 同じ字形・位置でも辞典の部首が分かれる（月＝つきへん／にくづき）ので呼び名も鍵に入れる
    const key = `${r.radical.element}\t${r.radical.position ?? ""}\t${r.radical.name ?? ""}`;
    const e = groups.get(key) ?? { element: r.radical.element, position: r.radical.position, name: r.radical.name, chars: [] };
    e.chars.push(r);
    groups.set(key, e);
  }
  const keys = [...groups.keys()].sort((a, b) => groups.get(b)!.chars.length - groups.get(a)!.chars.length);
  const sections = keys.map((key) => {
    const g = groups.get(key)!;
    const samples = g.chars
      .slice(0, samplesPer)
      .map((r) => `<svg viewBox="-4 -4 117 117" xmlns="http://www.w3.org/2000/svg">${renderGlyph(r, { dimNonRadical: true, showNumbers: false })}</svg>`)
      .join("");
    const name = g.name ?? '<span style="color:#d00">呼び名なし</span>';
    const chars = g.chars.map((r) => r.char).join("");
    return `<section><h2>${name} <small>${esc(g.element)}・${esc(g.position ?? "位置なし")}・${g.chars.length} 字</small></h2><div class="samples">${samples}</div><pre>${esc(chars)}</pre></section>`;
  });
  const withoutName = keys.filter((k) => groups.get(k)!.name === null).length;
  const head = `<h1>部首の呼び名と部首の画</h1><p>${keys.length} 通り（字形 × 位置）・呼び名なし ${withoutName} 通り。黒が部首の画で、紙面の部首欄はこの見え方で出る。呼び名は data/radical-names.json。</p>`;
  return wrapHtml("部首の一覧", head + sections.join("\n"));
}

// ---- CLI ----
async function main(): Promise<void> {
  const { readFileSync, writeFileSync, mkdirSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const { validateProfileTable } = await import("../profiles/types.js");
  const sharp = (await import("sharp")).default;
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const index = JSON.parse(readFileSync(root + "dist/index.json", "utf8")) as { chars: { codepoint: string; kind: string }[] };
  const table = validateProfileTable(JSON.parse(readFileSync(root + "data/stroke-profiles.json", "utf8")));
  const load = (cp: string): CharRecord => JSON.parse(readFileSync(`${root}dist/chars/${cp}.json`, "utf8")) as CharRecord;
  const kanji = index.chars.filter((c) => c.kind === "kanji").map((c) => load(c.codepoint));
  const kana = index.chars.filter((c) => c.kind !== "kanji").map((c) => load(c.codepoint));
  mkdirSync(root + "build", { recursive: true });

  const write = async (name: string, svg: string, title: string): Promise<void> => {
    writeFileSync(`${root}build/${name}.svg`, svg);
    writeFileSync(`${root}build/${name}.html`, wrapHtml(title, svg));
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`${root}build/${name}.png`);
    console.log(`wrote build/${name}.{svg,html,png}`);
  };
  await write("overview-kanji", renderGrid(kanji, { columns: 30, cell: 96, label: (r) => String(r.grade) }), "教育漢字 1,026 字（学年順）");
  await write("overview-kana", renderGrid(kana, { columns: 20, cell: 96 }), "かな 177 字");
  writeFileSync(root + "build/overview-types.html", renderTypesPage([...kanji, ...kana], table, 10));
  console.log("wrote build/overview-types.html");
  writeFileSync(root + "build/overview-radicals.html", renderRadicalsPage(kanji, 8));
  console.log("wrote build/overview-radicals.html");
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  });
}
