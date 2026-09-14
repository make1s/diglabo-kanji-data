import { describe, expect, it } from "vitest";
import { makeWidthCurve } from "./width-curve.js";
import { foldedSweepRegion, buildRefinedOutline } from "./refined-outline.js";
import { parseSvgPath } from "./path.js";
import { sampleCenterline } from "./sample.js";
import type { StrokeProfile } from "../profiles/types.js";

describe("滑らかな幅曲線", () => {
  const keys: [number, number][] = [[0, 0.9], [0.35, 1.05], [0.5125, 1], [0.7075, 0.74], [0.87, 0.35], [1, 0]];
  const f = makeWidthCurve(keys);
  it("指定幅を通り、細まる途中で幅が逆戻りせず、太さの範囲を超えない", () => {
    keys.forEach(([u, w]) => expect(f(u)).toBeCloseTo(w, 10));
    for (let i = 0; i < keys.length - 1; i++) {
      const [a, wa] = keys[i]!;
      const [b, wb] = keys[i + 1]!;
      let previous = f(a);
      for (let j = 1; j <= 100; j++) {
        const w = f(a + (b-a)*j/100);
        expect(w).toBeGreaterThanOrEqual(Math.min(wa, wb) - 1e-10);
        expect(w).toBeLessThanOrEqual(Math.max(wa, wb) + 1e-10);
        expect((w-previous)*(wb-wa)).toBeGreaterThanOrEqual(-1e-10);
        previous = w;
      }
    }
  });
  it("接続点の両側で傾きが連続し、払い途中の傾きが0にならない", () => {
    const e = 1e-7;
    for (const [u] of keys.slice(1, -1)) {
      const left = (f(u)-f(u-e))/e;
      const right = (f(u+e)-f(u))/e;
      expect(Math.abs(left-right)).toBeLessThan(1e-4);
      if (u > 0.35) expect(right).toBeLessThan(-0.01);
    }
  });
});

describe("折れからの払い", () => {
  const profile: StrokeProfile = { refinement: "foldedSweep", width: 0.9, start: "round", end: "point", keys: [[0, 1], [1, 1]] };
  it("同じ直線の分割位置を変えても払いの区間長は変わらない", () => {
    const a = sampleCenterline(parseSvgPath("M10,10L60,10L30,60"), 0.3);
    const b = sampleCenterline(parseSvgPath("M10,10L40,10L60,10L45,35L30,60"), 0.3);
    expect(foldedSweepRegion(a, 6.4)).toBeCloseTo(foldedSweepRegion(b, 6.4), 6);
    const poly = buildRefinedOutline(a, profile, 6.4);
    expect(poly).toContainEqual([30, 60]);
    expect(poly.every(p => p.every(Number.isFinite))).toBe(true);
  });
  it("長さ0の画でもNaNを出さない", () => {
    const a = sampleCenterline(parseSvgPath("M10,10L10,10"), 0.3);
    expect(buildRefinedOutline(a, profile, 6.4).every(p => p.every(Number.isFinite))).toBe(true);
  });
});

it("しんにょうの右払いは、週の前画の終点を輪郭の内側で受ける", () => {
  const a = sampleCenterline(parseSvgPath("M13.75,85.75c4.12-0.88,10.41-0.97,15-0.5c7.25,0.75,29.97,5.13,34.5,6c13,2.5,21.25,4.5,30.25,2.75"), 0.3);
  const profile: StrokeProfile = { refinement: "joinedSweep", width: 0.95, start: "round", end: "point", keys: [[0,0.9],[1,0]] };
  const poly = buildRefinedOutline(a, profile, 6.4);
  const p = [16.75,83.25];
  let inside = false;
  for (let i=0,j=poly.length-1;i<poly.length;j=i++) {
    const a=poly[i]!, b=poly[j]!;
    if ((a[1]>p[1]!)!==(b[1]>p[1]!) && p[0]!<(b[0]-a[0])*(p[1]!-a[1])/(b[1]-a[1])+a[0]) inside=!inside;
  }
  expect(inside).toBe(true);
});
