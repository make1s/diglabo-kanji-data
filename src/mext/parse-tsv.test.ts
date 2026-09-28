import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseMextAppendix, parseMextTsv } from "./parse-tsv.js";

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

describe("parseMextAppendix", () => {
  const tsv = readFileSync(new URL("../../input/mext-onkun-2017.tsv", import.meta.url), "utf8");
  const { jukujikun, prefectures, warnings } = parseMextAppendix(tsv);

  it("付表1 に 迷子・真っ青・明日 がある", () => {
    expect(jukujikun.find((w) => w.word === "迷子")).toEqual({ word: "迷子", reading: "まいご", stage: "elementary" });
    expect(jukujikun.find((w) => w.word === "真っ青")?.reading).toBe("まっさお");
    expect(jukujikun.find((w) => w.word === "明日")?.stage).toBe("elementary");
  });

  it("付表1 は読み・○を持たずブレースで直前行と共有する行（海士・伯父・伯母・母家・二十歳・川原・数奇屋）も引き継ぐ", () => {
    expect(jukujikun.find((w) => w.word === "海士")).toEqual({ word: "海士", reading: "あま", stage: "senior" });
    expect(jukujikun.find((w) => w.word === "伯父")?.reading).toBe("おじ");
    expect(jukujikun.find((w) => w.word === "数奇屋")?.reading).toBe("すきや");
  });

  it("付表1 の「師走」は注記『（「しはす」とも言う。）』を含む行でも読みが「しわす」に切り詰まる", () => {
    expect(jukujikun.find((w) => w.word === "師走")).toEqual({ word: "師走", reading: "しわす", stage: "senior" });
  });

  it("付表2 に 岐阜・大阪・愛媛・神奈川 があり小学校", () => {
    for (const [word, reading] of [
      ["岐阜", "ぎふ"],
      ["大阪", "おおさか"],
      ["愛媛", "えひめ"],
      ["神奈川", "かながわ"],
    ]) {
      expect(prefectures.find((w) => w.word === word)).toEqual({ word, reading, stage: "elementary" });
    }
  });

  // ⚠ 付表２は「都道府県名に用いる漢字で、常用漢字表の音訓欄に無い読み」だけを載せる注記表（PDF内の説明文どおり）。
  // 47都道府県ぶんではなく12語（愛媛・茨城・岐阜・鹿児島・滋賀・宮城・神奈川・鳥取・大阪・富山・大分・奈良）で全数
  it("付表2 は12語で全部小学校段階、語の数が○の数と一致し警告が無い", () => {
    expect(warnings).toEqual([]);
    expect(prefectures).toHaveLength(12);
    expect(prefectures.every((w) => w.stage === "elementary")).toBe(true);
    expect(jukujikun.length + prefectures.length).toBeGreaterThan(100);
  });
});
