import { describe, expect, it } from "vitest";
import { extendStrokeEnd } from "./extend-end.js";
import { buildOutline } from "./outline.js";
import { parseSvgPath } from "./path.js";
import { sampleCenterline } from "./sample.js";
import { validateProfileTable, type StrokeProfile } from "../profiles/types.js";

const profile: StrokeProfile = { width: 1, start: "round", end: "point", keys: [[0, 1], [1, 1]], endTaper: { lastSegment: true }, endExtension: { fraction: 0.08, maxWidth: 0.4 } };

describe("はらい・はねの延長", () => {
  it("元の中心線を動かさず、終端の接線方向へ延ばし、最後の細まり区間を引き継ぐ", () => {
    const a = sampleCenterline(parseSvgPath("M20,10L20,70L14,64"));
    const snapshot = structuredClone(a);
    const result = extendStrokeEnd(a, profile, 6);
    const end = result.points.at(-1)!;
    expect(result.points.slice(0, a.points.length)).toEqual(a.points);
    expect(end.x).toBeCloseTo(14 - 2.4 / Math.sqrt(2));
    expect(end.y).toBeCloseTo(64 - 2.4 / Math.sqrt(2));
    expect(result.length).toBeCloseTo(a.length + 2.4);
    expect(result.segmentLengths.at(-1)).toBeCloseTo(a.segmentLengths.at(-1)! + 2.4);
    expect(a).toEqual(snapshot);
    expect(buildOutline(a, profile, 6)).toContainEqual([end.x, end.y]);
  });
  it("短い画は全長の8%に抑え、密な字は基準太さに合わせて延長も小さくする", () => {
    const short = sampleCenterline(parseSvgPath("M10,10L15,10"));
    expect(extendStrokeEnd(short, profile, 6).length).toBeCloseTo(5.4);
    const long = sampleCenterline(parseSvgPath("M10,10L80,10"));
    expect(extendStrokeEnd(long, profile, 4).length).toBeCloseTo(71.6);
  });
  it("曲線の分割位置に依存せず、終端でとがる輪郭を作る", () => {
    const a = sampleCenterline(parseSvgPath("M10,10L80,80"), 0.3);
    const b = sampleCenterline(parseSvgPath("M10,10L40,40L80,80"), 0.3);
    const refined = { ...profile, refinement: "leftSweep" as const };
    const end = extendStrokeEnd(a, refined, 6).points.at(-1)!;
    expect(extendStrokeEnd(b, refined, 6).points.at(-1)!.x).toBeCloseTo(end.x);
    expect(buildOutline(a, refined, 6)).toContainEqual([end.x, end.y]);
    expect(buildOutline(b, refined, 6)).toContainEqual([end.x, end.y]);
  });
  it("設定なし・とめ・長さ0・点なしはそのまま返す", () => {
    const a = sampleCenterline(parseSvgPath("M10,10L80,10"));
    const { endExtension: _, ...plain } = profile;
    expect(extendStrokeEnd(a, plain, 6)).toBe(a);
    expect(extendStrokeEnd(a, { ...profile, end: "round" }, 6)).toBe(a);
    const zero = sampleCenterline(parseSvgPath("M10,10L10,10"));
    expect(extendStrokeEnd(zero, profile, 6)).toBe(zero);
    const empty = { points: [], length: 0, segmentLengths: [] };
    expect(extendStrokeEnd(empty, profile, 6)).toBe(empty);
  });
});

describe("延長設定の検証", () => {
  it.each([
    { fraction: 0, maxWidth: 0.4 }, { fraction: -1, maxWidth: 0.4 },
    { fraction: 1.1, maxWidth: 0.4 }, { fraction: 0.08, maxWidth: 0 },
    { fraction: 0.08, maxWidth: Infinity }, { fraction: 0.08, maxWidth: 1.1 },
  ])("不正な長さを取り込まない: %j", endExtension => {
    expect(() => validateProfileTable({ version: 1, stemWidth: 6, profiles: { test: { ...profile, endExtension } } })).toThrow();
  });
  it("とめの画には延長を指定できない", () => {
    expect(() => validateProfileTable({ version: 1, stemWidth: 6, profiles: { test: { ...profile, end: "round" } } })).toThrow();
  });
});
