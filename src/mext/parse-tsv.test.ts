import { describe, expect, it } from "vitest";
import { parseMextTsv } from "./parse-tsv.js";

const HEADER = "level\tpage_num\tpar_num\tblock_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext";
const row = (page: number, x: number, y: number, text: string): string => `5\t${page}\t1\t1\t1\t1\t${x}\t${y}\t10\t10\t-1\t${text}`;

const TSV = [
  HEADER,
  row(1, 99.2, 319.3, "備考"),
  row(1, 117.2, 412.4, "音訓欄には，字音を片仮名で，字訓を平仮名で示す。"),
  // 1段目: 悪 3 アク○小 / オ○高 / わるい○小
  row(2, 70.5, 100.0, "悪"), row(2, 95.0, 100.0, "3"), row(2, 120.0, 100.0, "アク"), row(2, 190.2, 100.0, "○"),
  row(2, 120.3, 114.0, "オ"), row(2, 275.0, 114.0, "○"),
  row(2, 120.1, 128.0, "わるい"), row(2, 190.0, 128.1, "○"),
  // 2段目: 成 4 セイ○小 / ジョウ(1字下げ)○高 / なる○小
  row(2, 310.8, 100.0, "成"), row(2, 334.6, 100.0, "4"), row(2, 361.4, 100.0, "セイ"), row(2, 432.5, 100.0, "○"),
  row(2, 367.7, 114.0, "ジョウ"), row(2, 515.0, 114.0, "○"),
  row(2, 361.4, 128.0, "なる"), row(2, 432.5, 128.0, "○"),
  // 3段目: 常用だが配当なし
  row(2, 550.6, 100.0, "亜"), row(2, 600.2, 100.0, "ア"), row(2, 715.0, 100.0, "○"),
  // 付表以降は読まない
  row(51, 59.0, 87.0, "付表１"),
  row(51, 70.0, 120.0, "明"), row(51, 120.0, 120.0, "あす"), row(51, 190.0, 120.0, "○"),
].join("\n");

describe("parseMextTsv", () => {
  it("段・行・○の位置から音訓と段階を組む", () => {
    const { entries, warnings } = parseMextTsv(TSV);
    expect(warnings).toEqual([]);
    expect(entries.map((e) => e.kanji)).toEqual(["悪", "成", "亜"]);
    expect(entries[0]).toEqual({
      kanji: "悪",
      grade: 3,
      readings: [
        { reading: "アク", kind: "on", stage: "elementary", special: false },
        { reading: "オ", kind: "on", stage: "senior", special: false },
        { reading: "わるい", kind: "kun", stage: "elementary", special: false },
      ],
    });
    expect(entries[1]).toEqual({
      kanji: "成",
      grade: 4,
      readings: [
        { reading: "セイ", kind: "on", stage: "elementary", special: false },
        { reading: "ジョウ", kind: "on", stage: "senior", special: true },
        { reading: "なる", kind: "kun", stage: "elementary", special: false },
      ],
    });
    expect(entries[2]).toEqual({ kanji: "亜", grade: null, readings: [{ reading: "ア", kind: "on", stage: "junior", special: false }] });
  });

  it("○の無い読みは warnings に出す", () => {
    const { entries, warnings } = parseMextTsv([HEADER, row(2, 70.5, 100, "悪"), row(2, 120.0, 100, "アク")].join("\n"));
    expect(entries[0]?.readings).toEqual([]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toMatch(/悪.*アク/);
  });
});
