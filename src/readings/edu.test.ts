import { describe, expect, it } from "vitest";
import type { KanjidicEntry } from "../kanjidic/parse.js";
import type { MextEntry } from "../mext/parse-tsv.js";
import { selectEduReadings } from "./edu.js";

const sei: KanjidicEntry = {
  char: "生", codepoint: "0751f", grade: 1, strokeCount: 5, radicalClassical: 100,
  on: ["セイ", "ショウ"],
  kun: ["い.きる", "い.かす", "い.ける", "う.まれる", "うま.れる", "う.まれ", "うまれ", "う.む", "お.う", "は.える", "は.やす", "き", "なま", "なま-", "な.る", "な.す", "む.す", "-う"],
  meanings: ["life"],
};
const r = (reading: string, stage: MextEntry["readings"][number]["stage"], special = false): MextEntry["readings"][number] => ({
  reading, kind: /^[ァ-ヶー]+$/.test(reading) ? "on" : "kun", stage, special,
});
const seiMext: MextEntry = {
  kanji: "生", grade: 1,
  readings: [r("セイ", "elementary"), r("ショウ", "elementary"), r("いきる", "elementary"), r("いかす", "elementary"), r("いける", "elementary"),
    r("うまれる", "elementary"), r("うむ", "elementary"), r("おう", "junior"), r("はえる", "elementary"), r("はやす", "elementary"),
    r("き", "junior"), r("なま", "elementary")],
};

describe("selectEduReadings", () => {
  it("小学校段階の読みだけを KANJIDIC2 の表記で返す", () => {
    const out = selectEduReadings(sei, seiMext);
    expect(out.on).toEqual(["セイ", "ショウ"]);
    expect(out.kun).toEqual(["い.きる", "い.かす", "い.ける", "う.まれる", "う.む", "は.える", "は.やす", "なま"]);
    expect(out.special).toEqual([]);
    expect(out.unmatched).toEqual([]);
  });
  it("KANJIDIC2 に無い読みは unmatched に出し、結果には入れない", () => {
    const out = selectEduReadings(sei, { ...seiMext, readings: [r("セイ", "elementary"), r("ほげる", "elementary")] });
    expect(out.on).toEqual(["セイ"]);
    expect(out.kun).toEqual([]);
    expect(out.unmatched).toEqual(["ほげる"]);
  });
  it("特別な読みは末尾に回し special に記録する", () => {
    const out = selectEduReadings(sei, { ...seiMext, readings: [r("ショウ", "elementary", true), r("セイ", "elementary"), r("なま", "elementary", true), r("いきる", "elementary")] });
    expect(out.on).toEqual(["セイ", "ショウ"]);
    expect(out.kun).toEqual(["い.きる", "なま"]);
    expect(out.special).toEqual(["ショウ", "なま"]);
  });
  it("overrides の add はそのまま加え、remove で外す", () => {
    const out = selectEduReadings(sei, seiMext, { add: ["な.る", "ショク"], remove: ["なま", "ショウ"] });
    expect(out.on).toEqual(["セイ", "ショク"]);
    expect(out.kun).toEqual(["い.きる", "い.かす", "い.ける", "う.まれる", "う.む", "は.える", "は.やす", "な.る"]);
  });
  it("add が写せなかった読みそのものなら unmatched から消える", () => {
    const out = selectEduReadings(sei, { ...seiMext, readings: [r("はやまる", "elementary")] }, { add: ["はや.まる"] });
    expect(out.kun).toEqual(["はや.まる"]);
    expect(out.unmatched).toEqual([]);
  });
  it("割り振り表に無い字は空", () => {
    expect(selectEduReadings(sei, undefined)).toEqual({ on: [], kun: [], special: [], unmatched: [] });
  });
});
