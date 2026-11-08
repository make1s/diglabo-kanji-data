import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import opentype from "opentype.js";
import { describe, expect, it } from "vitest";
import type { DatasetIndex } from "../build/types.js";
import type { TehonManifest } from "./tehon.js";

/**
 * コミットされた dist の手本フォントが、同じ回の字データと揃っていることを検める。
 * ⚠ 取り込み（import-chars.mjs）も同じ突き合わせをするが、書き出し途中の dist をコミットした時点で気づけるようにここでも見る。
 */
const root = new URL("../../", import.meta.url);
const read = (rel: string): Buffer => readFileSync(new URL(rel, root));

describe("dist/fonts", () => {
  const index = JSON.parse(read("dist/index.json").toString("utf8")) as DatasetIndex;
  const manifest = JSON.parse(read("dist/fonts/manifest.json").toString("utf8")) as TehonManifest;
  const woff2 = read(`dist/fonts/${manifest.file}`);

  it("manifest の版と設計図の版は字データの索引と同じ", () => {
    expect(manifest.version).toBe(index.version);
    expect(manifest.profilesVersion).toBe(index.profilesVersion);
  });

  it("manifest の sha256・bytes は実ファイルと一致する", () => {
    expect(manifest.sha256).toBe(createHash("sha256").update(woff2).digest("hex"));
    expect(manifest.bytes).toBe(woff2.length);
  });

  it("字集合は常用漢字 2,136 字＋常用外 4,223 字＋かな 177 字で、配当学年を持つのは教育漢字 1,026 字", () => {
    expect(index.counts.kanji).toBe(2136);
    expect(index.counts.kanjiExt).toBe(4223);
    expect(index.chars.filter((c) => c.jisLevel === 1)).toHaveLength(863);
    expect(index.chars.filter((c) => c.jisLevel === 2)).toHaveLength(3360);
    expect(index.counts.hiragana + index.counts.katakana).toBe(177);
    const graded = index.chars.filter((c) => c.grade !== null);
    expect(graded).toHaveLength(1026);
    expect(graded.every((c) => c.kind === "kanji" && c.grade! >= 1 && c.grade! <= 6)).toBe(true);
  });

  // tehon.woff2＝常用漢字・かな（jisLevel の無い字）＋ data/tehon-extra-chars.json。0.6.6 とバイト列を変えない（spec 2026-11-08 §3）
  const base = index.chars.filter((c) => c.jisLevel === undefined);
  const ext = index.chars.filter((c) => c.jisLevel !== undefined);

  it("tehon.woff2 の字数は常用漢字・かなと、tehon-extra-chars の合計", () => {
    const extra = JSON.parse(read("data/tehon-extra-chars.json").toString("utf8")) as { chars: string[] };
    const sorted = [...extra.chars].sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!);
    expect(manifest.extraChars).toEqual(sorted);
    const inBase = new Set(base.map((c) => c.char));
    expect(manifest.extraChars.filter((c) => inBase.has(c))).toEqual([]);
    expect(manifest.glyphCount).toBe(base.length + manifest.extraChars.length);
  });

  it("tehon.woff2 は常用漢字・かなとフォントだけの字を収録する", () => {
    const font = opentype.parse(new Uint8Array(read("dist/fonts/tehon.otf")).buffer);
    const missing = [...base.map((c) => c.char), ...manifest.extraChars].filter((c) => !font.charToGlyph(c) || font.charToGlyph(c).index === 0);
    expect(missing).toEqual([]);
    expect(font.numGlyphs).toBe(manifest.glyphCount + 1);
  });

  it("tehon-ext.woff2 は常用外の字から tehon.woff2 にある字を除いたもの。manifest-ext は実ファイルと一致する", () => {
    const m = JSON.parse(read("dist/fonts/manifest-ext.json").toString("utf8")) as TehonManifest;
    const bytes = read(`dist/fonts/${m.file}`);
    expect(m.file).toBe("tehon-ext.woff2");
    expect(m.version).toBe(index.version);
    expect(m.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
    const inBaseFont = new Set(manifest.extraChars);
    expect(m.glyphCount).toBe(ext.filter((c) => !inBaseFont.has(c.char)).length);
  });
});
