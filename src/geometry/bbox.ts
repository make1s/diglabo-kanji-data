import type { Point } from "./path.js";

/** [x, y, w, h] */
export type BBox = [number, number, number, number];

export function bboxOfPoints(points: readonly Point[]): BBox {
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = Number.NEGATIVE_INFINITY;
  let y1 = Number.NEGATIVE_INFINITY;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  if (points.length === 0) return [0, 0, 0, 0];
  return [x0, y0, x1 - x0, y1 - y0];
}

export function unionBBox(a: BBox, b: BBox): BBox {
  const x0 = Math.min(a[0], b[0]);
  const y0 = Math.min(a[1], b[1]);
  const x1 = Math.max(a[0] + a[2], b[0] + b[2]);
  const y1 = Math.max(a[1] + a[3], b[1] + b[3]);
  return [x0, y0, x1 - x0, y1 - y0];
}
