import type { StrokeProfile } from "../profiles/types.js";
import type { Point } from "./path.js";
import type { Sampled } from "./sample.js";

const clamp01 = (v: number): number => (v < 0 ? 0 : v > 1 ? 1 : v);

function interpolateKeys(keys: readonly (readonly [number, number])[], u: number): number {
  const first = keys[0]!;
  if (u <= first[0]) return first[1];
  for (let i = 1; i < keys.length; i++) {
    const [p0, f0] = keys[i - 1]!;
    const [p1, f1] = keys[i]!;
    if (u <= p1) return p1 === p0 ? f1 : f0 + ((f1 - f0) * (u - p0)) / (p1 - p0);
  }
  return keys[keys.length - 1]![1];
}

/** 弧長 s での太さ（直径） */
export function widthAt(s: number, sampled: Sampled, profile: StrokeProfile, stemWidth: number): number {
  const L = sampled.length;
  let f = interpolateKeys(profile.keys, L > 0 ? clamp01(s / L) : 0);
  const taper = profile.endTaper;
  if (taper) {
    const region = "lastSegment" in taper ? (sampled.segmentLengths[sampled.segmentLengths.length - 1] ?? 0) : Math.min(L * taper.fraction, taper.maxLen);
    if (region > 0 && s > L - region) {
      const u = clamp01((s - (L - region)) / region);
      f *= Math.pow(1 - u, taper.ease ?? 1);
    }
  }
  return stemWidth * profile.width * f;
}

/** center を中心に半径 r、方向 from から to へ 90°×2 回る半円の内側の点（両端は含まない） */
function halfCircle(center: Point, r: number, axis: Point, side: Point, steps: number, reverse: boolean): Point[] {
  const pts: Point[] = [];
  for (let i = 1; i < steps; i++) {
    const theta = (Math.PI / 2) * (1 - (2 * i) / steps) * (reverse ? -1 : 1);
    const c = Math.cos(theta);
    const sn = Math.sin(theta);
    pts.push([center[0] + r * (c * axis[0] + sn * side[0]), center[1] + r * (c * axis[1] + sn * side[1])]);
  }
  return pts;
}

/**
 * 中心線の標本点と設計図から、閉じたアウトライン多角形を作る。
 * 左側の点列 → 終端キャップ → 右側の点列（逆順） → 始端キャップ の順。
 * point の端は左右の点が端点に一致する（太さ 0）。
 */
export function buildOutline(sampled: Sampled, profile: StrokeProfile, stemWidth: number): Point[] {
  const pts = sampled.points;
  const n = pts.length;
  if (n === 0) return [];
  const widths = pts.map((p) => widthAt(p.s, sampled, profile, stemWidth));
  if (profile.start === "point") widths[0] = 0;
  if (profile.end === "point") widths[n - 1] = 0;

  const left: Point[] = [];
  const right: Point[] = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i]!;
    const h = widths[i]! / 2;
    const nx = -p.ty;
    const ny = p.tx;
    left.push([p.x + nx * h, p.y + ny * h]);
    right.push([p.x - nx * h, p.y - ny * h]);
  }

  const poly: Point[] = [...left];
  const last = pts[n - 1]!;
  const lastR = widths[n - 1]! / 2;
  if (profile.end === "round" && lastR > 0) {
    // 左法線 → 接線 → 右法線
    poly.push(...halfCircle([last.x, last.y], lastR, [last.tx, last.ty], [-last.ty, last.tx], 8, false));
  }
  for (let i = n - 1; i >= 0; i--) poly.push(right[i]!);
  const first = pts[0]!;
  const firstR = widths[0]! / 2;
  if (profile.start === "round" && firstR > 0) {
    // 右法線 → 逆接線 → 左法線
    poly.push(...halfCircle([first.x, first.y], firstR, [-first.tx, -first.ty], [-first.ty, first.tx], 8, true));
  }
  return poly;
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = clamp01(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2);
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
}

/** Ramer–Douglas–Peucker で点列を間引く（両端は残る） */
export function simplifyPolyline(points: readonly Point[], tolerance = 0.08): Point[] {
  if (points.length <= 2) return [...points];
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length > 0) {
    const [i0, i1] = stack.pop()!;
    let best = -1;
    let bestDist = tolerance;
    for (let i = i0 + 1; i < i1; i++) {
      const d = distanceToSegment(points[i]!, points[i0]!, points[i1]!);
      if (d > bestDist) {
        bestDist = d;
        best = i;
      }
    }
    if (best >= 0) {
      keep[best] = true;
      stack.push([i0, best], [best, i1]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function fmt(v: number, digits: number): string {
  const r = Number(v.toFixed(digits));
  return (Object.is(r, -0) ? 0 : r).toString();
}

/** 閉じた多角形を SVG の path `d` にする（M…L…Z、既定は小数1桁） */
export function toPathD(points: readonly Point[], digits = 1): string {
  if (points.length === 0) return "";
  return points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${fmt(x, digits)},${fmt(y, digits)}`).join("") + "Z";
}
