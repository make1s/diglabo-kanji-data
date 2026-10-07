/** READMEの図版を、配布中のフォント・文字データ・公開描画APIから生成する。 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { listParts, renderCharacter } from "../packages/kanji/src/index.js";
import type { DatasetManifest, Glyph, RenderOptions } from "../packages/kanji/src/types.js";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (path: string): string => readFileSync(resolve(root, path), "utf8");
const output = resolve(root, "docs/images");
mkdirSync(output, { recursive: true });
const font = readFileSync(resolve(root, "dist/fonts/tehon.woff2"));
const fontManifest = JSON.parse(read("dist/fonts/manifest.json")) as { version: string; sha256: string };
if (createHash("sha256").update(font).digest("hex") !== fontManifest.sha256) throw new Error("フォントのmanifestと配布物が一致しません");
const manifest = JSON.parse(read("packages/data/dist/manifest.json")) as DatasetManifest;
if (manifest.datasetVersion !== fontManifest.version) throw new Error("文字データとフォントの版が一致しません");
const glyph = (char: string): Glyph => ({
  manifest,
  record: JSON.parse(read(`dist/chars/${char.codePointAt(0)!.toString(16).padStart(5, "0")}.json`)) as Glyph["record"],
});
const drawing = (char: string, options: RenderOptions = {}): string => renderCharacter(glyph(char), { size: 180, color: "#233e38", ...options }).svg;
const woods = listParts(glyph("林")).filter((part) => part.element === "木");
if (woods.length !== 2) throw new Error("林の二つの木を区別できません");
const credit = `<footer>字形：KanjiVG (CC BY-SA 3.0) / KANJIDIC2 © EDRDG (CC BY-SA 4.0) · データ ${manifest.datasetVersion}</footer>`;
const images = [
  {
    name: "hero", height: 430,
    body: `<div class="eyebrow">DIGLABO TEHON</div><div class="hero-characters tehon">永休林道</div><div class="hero-caption">フォント・SVG・文字データで、漢字の手本を。</div>${credit}`,
  },
  {
    name: "font-specimen", height: 540,
    body: `<header><h1>DiglaboTehon</h1><span>配布フォントの実際の表示</span></header><div class="font-lines tehon"><div class="kanji">春夏秋冬 山川空海</div><div>あいうえお かきくけこ</div><div>アイウエオ カキクケコ</div></div>${credit}`,
  },
  {
    name: "stroke-order", height: 390,
    body: `<header><h1>画ごとに、筆順を表示</h1><span>「永」 · 1画から全5画へ</span></header><div class="stages">${[1, 2, 3, 4, 5].map((n) => `<div class="stage">${drawing("永", { size: 166, visibleStrokes: n })}<span>${n}画</span></div>`).join("")}</div>${credit}`,
  },
  {
    name: "parts", height: 410,
    body: `<header><h1>同じ名前の部品も、別々に選べる</h1><span>「林」の二つの「木」</span></header><div class="parts"><div>${drawing("林")}<span>手本</span></div><div>${drawing("林", { highlightPartIds: [woods[0]!.id], highlightColor: "#c95732" })}<span>左の「木」を選択</span></div><div>${drawing("林", { highlightPartIds: [woods[1]!.id], highlightColor: "#267c69" })}<span>右の「木」を選択</span></div></div>${credit}`,
  },
];
const css = `
  @font-face{font-family:DiglaboTehon;src:url(data:font/woff2;base64,${font.toString("base64")}) format("woff2");font-weight:400;font-style:normal}
  *{box-sizing:border-box}body{margin:0;color:#233e38;font-family:"Hiragino Sans","Noto Sans CJK JP",sans-serif}
  .sheet{width:1200px;height:var(--height);position:relative;overflow:hidden;background:#f6f5ed;padding:34px 48px}
  .tehon{font-family:DiglaboTehon,serif;font-weight:400;font-synthesis:none}
  header{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1px solid #d8dfd4;padding-bottom:18px}
  h1{font-size:28px;font-weight:600;margin:0;letter-spacing:.03em}header>span{font-size:19px;color:#62766e}
  footer{position:absolute;bottom:20px;left:48px;color:#62766e;font-size:14px}
  .eyebrow{font-size:20px;letter-spacing:.19em;font-weight:600}
  .hero-characters{font-size:215px;line-height:1.16;letter-spacing:.1em;text-align:center;margin-top:12px;padding-left:.1em}
  .hero-caption{text-align:center;font-size:24px;letter-spacing:.1em;margin-top:2px}
  .font-lines{padding-top:28px;font-size:71px;line-height:1.44;text-align:center;letter-spacing:.04em}
  .font-lines .kanji{font-size:103px;line-height:1.4}
  .stages{display:flex;justify-content:space-between;margin-top:17px}.stage{text-align:center;position:relative;width:192px}
  .stage:not(:last-child):after{content:"→";position:absolute;right:-31px;top:68px;color:#97a89b;font-size:28px}
  .stage span,.parts span{display:block;font-size:21px;color:#526b61;margin-top:2px}
  .parts{display:flex;justify-content:space-around;text-align:center;margin-top:20px}
`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 600 }, deviceScaleFactor: 2 });
  for (const item of images) {
    await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>${css}</style><main class="sheet" style="--height:${item.height}px">${item.body}</main></html>`);
    await page.evaluate('document.fonts.load("103px DiglaboTehon", "春夏秋冬")');
    await page.evaluate("document.fonts.ready");
    if (!await page.evaluate<boolean>('document.fonts.check(\'103px DiglaboTehon\', "春夏秋冬")')) throw new Error("手本フォントの読込に失敗しました");
    const screenshot = await page.locator(".sheet").screenshot();
    await sharp(screenshot).png({ palette: true, effort: 10 }).toFile(resolve(output, `${item.name}.png`));
    console.log(`README画像: ${item.name}.png`);
  }
} finally {
  await browser.close();
}
writeFileSync(resolve(output, "manifest.json"), JSON.stringify({ datasetVersion: manifest.datasetVersion, fontSha256: fontManifest.sha256, images: images.map(({ name }) => `${name}.png`) }, null, 2) + "\n");
