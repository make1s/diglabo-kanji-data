import type { StrokeProfile } from "../profiles/types.js";
import type { Point } from "./path.js";
import type { Sampled } from "./sample.js";
import { makeWidthCurve } from "./width-curve.js";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** セグメント境界に依存せず、終端方向へ抜ける連続区間を探す。 */
export function hookRegion(a: Sampled, stem: number): number {
  const end = a.points.at(-1);
  if (!end) return 0;
  let start = end.s;
  for (let i = a.points.length - 1; i >= 0; i--) {
    const p = a.points[i]!;
    if (p.s < a.length * 0.65 || p.tx * end.tx + p.ty * end.ty < 0.45) break;
    start = p.s;
  }
  return Math.min(a.length * 0.3, clamp(a.length - start + stem * 0.3, stem * 0.65, stem * 2.2));
}

/** 折れから左下へ進む連続区間。横画の太さは維持する。 */
export function foldedSweepRegion(a: Sampled, stem: number): number {
  let start = a.length;
  for (let i = a.points.length - 1; i >= 0; i--) {
    const p = a.points[i]!;
    if (p.tx >= 0 || p.ty <= 0) break;
    start = p.s;
  }
  return clamp(a.length - start, Math.min(a.length * 0.2, stem), a.length * 0.95);
}

/** 承認済み第3案の太さ。引数は中心線上の弧長。 */
export function refinedWidthCurve(a: Sampled, profile: StrokeProfile, stem: number): (s: number) => number {
  if (a.length <= 0) return () => 0;
  const isJoined = profile.refinement === "joinedSweep";
  const isRight = profile.refinement === "rightSweep" || isJoined;
  const isHook = profile.refinement === "hook";
  const isFolded = profile.refinement === "foldedSweep";
  const region = isFolded ? foldedSweepRegion(a, stem) : isHook ? hookRegion(a, stem) : Math.min(a.length * 0.34, 24);
  const start = 1 - region / a.length;
  const keys: [number, number][] = isRight
    ? [[0, isJoined ? 0.9 : 0], [0.06, isJoined ? 0.95 : 0.52], [0.48, 1.03], [start, 1.06], [start + (1-start)*0.35, 0.76], [start + (1-start)*0.7, 0.32], [1, 0]]
    : isFolded
      ? [[0, 0.9], [start, 1.05], [start + (1-start)*0.25, 1.0], [start + (1-start)*0.55, 0.74], [start + (1-start)*0.8, 0.35], [1, 0]]
      : isHook
        ? [[0, 1], [start, 1.02], [start + (1-start)*0.3, 0.95], [start + (1-start)*0.65, 0.48], [1, 0]]
        : [[0, 0.95], [0.24, 1.01], [0.47, 0.94], [0.7, 0.63], [0.87, 0.28], [1, 0]];
  const widthCurve = makeWidthCurve(keys);
  return s => stem * profile.width * widthCurve(clamp(s / a.length, 0, 1));
}

/** 2026-09-14 承認済み第3案。中心線と終点を保ち、画種共通の幅曲線で描く。 */
export function buildRefinedOutline(a: Sampled, profile: StrokeProfile, stem: number): Point[] {
  if (!a.points.length) return [];
  if (a.length <= 0) return a.points.map(p => [p.x, p.y]);
  const isRight = profile.refinement === "rightSweep" || profile.refinement === "joinedSweep";
  const widthCurve = refinedWidthCurve(a, profile, stem);
  const widths = a.points.map(p => widthCurve(p.s));
  if (profile.start === "point") widths[0] = 0;
  widths[widths.length - 1] = 0;
  const left: Point[] = [];
  const right: Point[] = [];
  a.points.forEach((p, i) => {
    const h = widths[i]! / 2;
    const u = p.s / a.length;
    const shift = isRight && u > 0.48 ? 0.25 * Math.sin(Math.PI * clamp((u-0.48)/0.52, 0, 1)) : 0;
    left.push([p.x - p.ty*h*(1+shift), p.y + p.tx*h*(1+shift)]);
    right.push([p.x + p.ty*h*(1-shift), p.y - p.tx*h*(1-shift)]);
  });
  const poly: Point[] = [...left, ...right.reverse()];
  if (profile.start === "round") {
    const p = a.points[0]!;
    const h = widths[0]! / 2;
    for (let i = 1; i < 16; i++) {
      const theta = -Math.PI/2 + Math.PI*i/16;
      poly.push([p.x-h*(Math.cos(theta)*p.tx+Math.sin(theta)*p.ty), p.y+h*(-Math.cos(theta)*p.ty+Math.sin(theta)*p.tx)]);
    }
  }
  if (poly.some(p => p.some(v => !Number.isFinite(v)))) throw new Error("輪郭に不正な座標");
  return poly;
}
