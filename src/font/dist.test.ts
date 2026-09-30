import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
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

  it("字集合は常用漢字 2,136 字＋かな 177 字で、配当学年を持つのは教育漢字 1,026 字", () => {
    expect(index.counts.kanji).toBe(2136);
    expect(index.counts.hiragana + index.counts.katakana).toBe(177);
    const graded = index.chars.filter((c) => c.grade !== null);
    expect(graded).toHaveLength(1026);
    expect(graded.every((c) => c.kind === "kanji" && c.grade! >= 1 && c.grade! <= 6)).toBe(true);
  });

  it("字数は索引の全字と同じ", () => {
    expect(manifest.glyphCount).toBe(index.chars.length);
  });
});
