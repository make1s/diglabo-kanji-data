import { describe, expect, it } from "vitest";
import { parseSvgPath } from "./path.js";
import { sampleCenterline } from "./sample.js";

describe("sampleCenterline", () => {
  it("直線の長さと単位接線を出す", () => {
    const s = sampleCenterline(parseSvgPath("M0,0L40,0"));
    expect(s.length).toBeCloseTo(40, 6);
    expect(s.points.length).toBeGreaterThanOrEqual(Math.ceil(40 / 1.5));
    for (const p of s.points) {
      expect(Math.hypot(p.tx, p.ty)).toBeCloseTo(1, 6);
      expect(p.ty).toBeCloseTo(0, 6);
    }
    expect(s.points[0]?.s).toBe(0);
    expect(s.points.at(-1)?.s).toBeCloseTo(40, 6);
    expect(s.points.at(-1)?.x).toBeCloseTo(40, 6);
  });

  it("四分円の近似ベジエの弧長を出す", () => {
    const k = 0.5522847498;
    const s = sampleCenterline(parseSvgPath(`M10,0C10,${10 * k},${10 * k},10,0,10`), 0.5);
    expect(s.length).toBeCloseTo(Math.PI * 5, 1);
    expect(s.segmentLengths.reduce((a, b) => a + b, 0)).toBeCloseTo(s.length, 9);
  });

  it("セグメント番号と区間長を持つ", () => {
    const s = sampleCenterline(parseSvgPath("M0,0L30,0L30,10"));
    expect(s.segmentLengths[0]).toBeCloseTo(30, 6);
    expect(s.segmentLengths[1]).toBeCloseTo(10, 6);
    expect(s.points.filter((p) => p.seg === 1).length).toBeGreaterThan(0);
    expect(s.points.every((p) => p.seg === 0 || p.seg === 1)).toBe(true);
  });

  it("長さ 0 の区間でも接線が NaN にならない", () => {
    const s = sampleCenterline(parseSvgPath("M0,0L0,0L10,0"));
    for (const p of s.points) expect(Math.hypot(p.tx, p.ty)).toBeCloseTo(1, 6);
  });
});
