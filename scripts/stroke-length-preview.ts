/** pnpm exec tsx scripts/stroke-length-preview.ts <比較前のデータ根> [出力先] */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { CharRecord } from "../src/build/types.js";
import { buildOutline, simplifyPolyline, toPathD } from "../src/geometry/outline.js";
import { parseSvgPath } from "../src/geometry/path.js";
import { sampleCenterline } from "../src/geometry/sample.js";
import { stemScaleFor, validateProfileTable } from "../src/profiles/types.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const baseline = resolve(process.argv[2] ?? root);
const output = resolve(process.argv[3] ?? `${root}build/stroke-length`);
const table = validateProfileTable(JSON.parse(readFileSync(`${root}data/stroke-profiles.json`, "utf8")));
const groups = [
  { name: "左右のはらい", chars: "人木大太交少" },
  { name: "折れからのはらい・短い画", chars: "今多夕友名冬" },
  { name: "縦画・折れからのはね", chars: "小水子手月力" },
  { name: "曲がりからのはね・密な字", chars: "元兄光九心風" },
  { name: "しんにょう・画数の多い字", chars: "週道遠議競警" },
];
const glyph = (r: CharRecord, changed: Set<number>, overlay = false) => `<svg viewBox="0 0 109 109" aria-label="${r.char}" role="img"><path class="guide" d="M0 54.5H109M54.5 0V109"/>${r.strokes.map(s => `<path class="${changed.has(s.n) ? "changed" : "unchanged"}" d="${s.outline}"/>`).join("")}${overlay ? r.strokes.filter(s => changed.has(s.n)).map(s => `<path class="centerline" d="${s.centerline}"/>`).join("") : ""}</svg>`;
const measurements: { char: string; strokes: { n: number; profile: string; extension: number }[] }[] = [];
const sections = groups.map(group => `<section><h2>${group.name}</h2><div class="grid">${[...group.chars].map(char => {
  const cp = char.codePointAt(0)!.toString(16).padStart(5, "0");
  const before: CharRecord = JSON.parse(readFileSync(`${baseline}/dist/chars/${cp}.json`, "utf8"));
  const stem = table.stemWidth * stemScaleFor(before.strokeCount, table.densityScale);
  const changed = new Set<number>();
  const measures: { n: number; profile: string; extension: number }[] = [];
  const after: CharRecord = { ...before, strokes: before.strokes.map(s => {
    const profile = table.profiles[s.profile]!;
    if (!profile.endExtension) return s;
    changed.add(s.n);
    const a = sampleCenterline(parseSvgPath(s.centerline), profile.refinement ? 0.3 : 1.5);
    measures.push({ n: s.n, profile: s.profile, extension: Math.min(a.length * profile.endExtension.fraction, stem * profile.endExtension.maxWidth) });
    return { ...s, outline: toPathD(simplifyPolyline(buildOutline(a, profile, stem), profile.refinement ? 0.015 : 0.08), profile.refinement ? 3 : 1) };
  }) };
  measurements.push({ char, strokes: measures });
  return `<article><h3>${char}</h3><div class="pair"><div><label>調整前</label>${glyph(before, changed)}</div><div><label>調整後</label>${glyph(after, changed, true)}</div></div></article>`;
}).join("")}</div></section>`).join("");
const html = `<!doctype html><html lang="ja"><meta charset="utf-8"><title>はらい・はねの長さ比較</title><style>
*{box-sizing:border-box}body{--size:112px;margin:24px;color:#202822;background:#fafbf9;font-family:system-ui,sans-serif}h1{font-size:24px;margin:0 0 10px}p{font-size:13px;margin:6px 0;color:#5c675e}.controls{display:flex;flex-wrap:wrap;gap:20px;align-items:center;position:sticky;top:0;background:#fafbf9ee;padding:12px 0;z-index:2}h2{font-size:16px;margin:20px 0 8px}h3{font-size:14px;margin:0 0 5px}.grid{display:grid;grid-template-columns:repeat(6,max-content);gap:10px}article{background:white;border:1px solid #dce2dc;border-radius:6px;padding:9px}.pair{display:flex;gap:7px}.pair label{display:block;text-align:center;font-size:11px;color:#667269}svg{display:block;width:var(--size);height:var(--size);fill:#101914}.guide{fill:none;stroke:#e8ede8;stroke-width:.5;stroke-dasharray:2 3}.centerline{display:none;fill:none;stroke:#177bc5;stroke-width:.35}body.highlight .changed{fill:#c14b31}body.overlay .centerline{display:block}footer{font-size:11px;margin-top:22px;color:#667269}@media(max-width:1250px){.grid{grid-template-columns:repeat(4,max-content)}}@media(max-width:850px){.grid{grid-template-columns:repeat(2,max-content)}}@media(max-width:550px){.grid{grid-template-columns:repeat(1,max-content)}}@media print{body{--size:16mm;margin:10mm}.controls{display:none}.grid{grid-template-columns:repeat(6,max-content);gap:2mm}article{padding:1mm}h2{margin:3mm 0 1mm}h1{font-size:16px}p,footer{font-size:9px}section{break-inside:avoid}}
</style><h1>はらい・はねの長さ比較</h1><p>元の曲線の終端方向へ短く延長し、太さを滑らかに先端までつなげた案。左が調整前、右が調整後。</p><p>払いは最大で基準線幅の55%、はねは40%、折れ払いは45%。短い画は全長の8%まで、画数が多い字は延長も控えめにしています。</p><div class="controls"><label>表示サイズ <select id="size"><option value="112px">拡大</option><option value="16mm">16mm</option><option value="10mm">10mm</option><option value="6mm">6mm</option></select></label><label><input id="highlight" type="checkbox">調整した画を強調</label><label><input id="overlay" type="checkbox">元の中心線を重ねる（青）</label></div>${sections}<footer>ローカル調整案（未配備）。KanjiVG (CC BY-SA 3.0) / KANJIDIC2 © EDRDG (CC BY-SA 4.0)</footer><script>document.querySelector('#size').onchange=e=>document.body.style.setProperty('--size',e.target.value);for(const name of ['highlight','overlay'])document.getElementById(name).onchange=e=>document.body.classList.toggle(name,e.target.checked);</script></html>`;
mkdirSync(output, { recursive: true });
writeFileSync(`${output}/comparison.html`, html);
writeFileSync(`${output}/measurements.json`, JSON.stringify(measurements, null, 2) + "\n");
console.log(output);
