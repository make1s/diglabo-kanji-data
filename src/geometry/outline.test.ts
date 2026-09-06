import { describe, expect, it } from "vitest";
import type { StrokeProfile } from "../profiles/types.js";
import { bboxOfPoints } from "./bbox.js";
import { buildOutline, simplifyPolyline, toPathD, widthAt } from "./outline.js";
import { parseSvgPath } from "./path.js";
import { sampleCenterline } from "./sample.js";

const stem = 6;
const uniform: StrokeProfile = { width: 1, start: "round", end: "round", keys: [[0, 1], [1, 1]] };

describe("widthAt", () => {
  it("keys を弧長比率で線形補間する", () => {
    const p: StrokeProfile = { width: 1, start: "flat", end: "flat", keys: [[0, 0.5], [1, 1.5]] };
    const s = sampleCenterline(parseSvgPath("M0,0L100,0"));
    expect(widthAt(0, s, p, 10)).toBeCloseTo(5, 6);
    expect(widthAt(50, s, p, 10)).toBeCloseTo(10, 6);
    expect(widthAt(100, s, p, 10)).toBeCloseTo(15, 6);
  });
  it("endTaper の領域長は min(L×fraction, maxLen)", () => {
    const p: StrokeProfile = { width: 1, start: "flat", end: "point", keys: [[0, 1], [1, 1]], endTaper: { fraction: 0.5, maxLen: 10 } };
    const s = sampleCenterline(parseSvgPath("M0,0L100,0"));
    expect(widthAt(89, s, p, 10)).toBeCloseTo(10, 6);
    expect(widthAt(95, s, p, 10)).toBeCloseTo(5, 6);
    expect(widthAt(100, s, p, 10)).toBeCloseTo(0, 6);
  });
  it("lastSegment は最後の区間だけで 0 へ落とす", () => {
    const p: StrokeProfile = { width: 1, start: "round", end: "point", keys: [[0, 1], [1, 1]], endTaper: { lastSegment: true } };
    const s = sampleCenterline(parseSvgPath("M10,10L10,60L0,70"));
    const l0 = s.segmentLengths[0]!;
    expect(widthAt(l0, s, p, stem)).toBeCloseTo(stem, 6);
    expect(widthAt(s.length, s, p, stem)).toBeCloseTo(0, 6);
    expect(widthAt(l0 + s.segmentLengths[1]! / 2, s, p, stem)).toBeCloseTo(stem / 2, 6);
  });
  it("ease は (1-u)^ease", () => {
    const p: StrokeProfile = { width: 1, start: "flat", end: "point", keys: [[0, 1], [1, 1]], endTaper: { fraction: 1, maxLen: 100, ease: 2 } };
    const s = sampleCenterline(parseSvgPath("M0,0L100,0"));
    expect(widthAt(50, s, p, 10)).toBeCloseTo(2.5, 6);
  });
});

describe("buildOutline", () => {
  it("直線を丸いキャップつきで包む", () => {
    const s = sampleCenterline(parseSvgPath("M10,50L50,50"));
    const poly = buildOutline(s, uniform, stem);
    const [x, y, w, h] = bboxOfPoints(poly);
    expect(x).toBeCloseTo(10 - stem / 2, 1);
    expect(y).toBeCloseTo(50 - stem / 2, 1);
    expect(w).toBeCloseTo(40 + stem, 1);
    expect(h).toBeCloseTo(stem, 1);
    for (const [px, py] of poly) expect(Number.isFinite(px) && Number.isFinite(py)).toBe(true);
    expect(poly.length).toBeGreaterThan(8);
  });
  it("point の終端は終点を通る", () => {
    const p: StrokeProfile = { width: 1, start: "round", end: "point", keys: [[0, 1], [1, 1]], endTaper: { lastSegment: true } };
    const poly = buildOutline(sampleCenterline(parseSvgPath("M10,10L10,60L0,70")), p, stem);
    expect(poly.some(([px, py]) => Math.abs(px) < 1e-6 && Math.abs(py - 70) < 1e-6)).toBe(true);
  });
  it("point の始端は始点を通る", () => {
    const p: StrokeProfile = { width: 1, start: "point", end: "round", keys: [[0, 0.5], [1, 1]] };
    const poly = buildOutline(sampleCenterline(parseSvgPath("M20,20L40,40")), p, stem);
    expect(poly.some(([px, py]) => Math.abs(px - 20) < 1e-6 && Math.abs(py - 20) < 1e-6)).toBe(true);
  });
});

describe("simplifyPolyline / toPathD", () => {
  it("共線の点を落とす", () => {
    expect(simplifyPolyline([[0, 0], [1, 0], [2, 0], [3, 0.01], [4, 0]], 0.08)).toEqual([[0, 0], [4, 0]]);
  });
  it("角は残す", () => {
    expect(simplifyPolyline([[0, 0], [5, 0], [5, 5]], 0.08)).toEqual([[0, 0], [5, 0], [5, 5]]);
  });
  it("閉じたパスを小数1桁で書く", () => {
    expect(toPathD([[0, 0], [10.123, 0], [10, 5.56]])).toBe("M0,0L10.1,0L10,5.6Z");
  });
});
