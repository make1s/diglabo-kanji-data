import type { CubicSegment, Point } from "./path.js";

/** 中心線上の標本点。s は弧長（0 始まり）、seg は属するセグメント番号、(tx, ty) は単位接線 */
export interface Sample {
  x: number;
  y: number;
  tx: number;
  ty: number;
  s: number;
  seg: number;
}

export interface Sampled {
  points: Sample[];
  /** 全長（弧長） */
  length: number;
  /** セグメントごとの弧長 */
  segmentLengths: number[];
}

function bezierAt(seg: CubicSegment, t: number): Point {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [
    a * seg[0][0] + b * seg[1][0] + c * seg[2][0] + d * seg[3][0],
    a * seg[0][1] + b * seg[1][1] + c * seg[2][1] + d * seg[3][1],
  ];
}

function derivativeAt(seg: CubicSegment, t: number): Point {
  const u = 1 - t;
  return [
    3 * u * u * (seg[1][0] - seg[0][0]) + 6 * u * t * (seg[2][0] - seg[1][0]) + 3 * t * t * (seg[3][0] - seg[2][0]),
    3 * u * u * (seg[1][1] - seg[0][1]) + 6 * u * t * (seg[2][1] - seg[1][1]) + 3 * t * t * (seg[3][1] - seg[2][1]),
  ];
}

const EPS = 1e-9;

function unit(v: Point): Point | null {
  const n = Math.hypot(v[0], v[1]);
  return n < EPS ? null : [v[0] / n, v[1] / n];
}

/**
 * 中心線を弧長おおむね `step` 間隔で標本化する。
 * セグメントの継ぎ目は両側に1点ずつ持つ（角で接線が変わるため）。
 * 接線はベジエの導関数。導関数が 0 の点（直線の退化ベジエの端など）は弦の向き、それも無ければ隣の接線を使う。
 */
export function sampleCenterline(segs: CubicSegment[], step = 1.5): Sampled {
  const points: Sample[] = [];
  const segmentLengths: number[] = [];
  let s = 0;

  segs.forEach((seg, si) => {
    let rough = 0;
    let prev = bezierAt(seg, 0);
    for (let k = 1; k <= 16; k++) {
      const q = bezierAt(seg, k / 16);
      rough += Math.hypot(q[0] - prev[0], q[1] - prev[1]);
      prev = q;
    }
    const n = Math.max(6, Math.ceil(rough / step));
    const chord = unit([seg[3][0] - seg[0][0], seg[3][1] - seg[0][1]]);
    let segLen = 0;
    prev = bezierAt(seg, 0);
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      const p = bezierAt(seg, t);
      if (k > 0) {
        segLen += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
        prev = p;
      }
      const tan = unit(derivativeAt(seg, t)) ?? chord;
      points.push({ x: p[0], y: p[1], tx: tan?.[0] ?? Number.NaN, ty: tan?.[1] ?? Number.NaN, s: s + segLen, seg: si });
    }
    segmentLengths.push(segLen);
    s += segLen;
  });

  // 接線が決まらなかった点は前後の決まっている点から借りる
  for (let i = 0; i < points.length; i++) {
    const p = points[i]!;
    if (!Number.isNaN(p.tx)) continue;
    const donor = points.slice(i + 1).find((q) => !Number.isNaN(q.tx)) ?? [...points.slice(0, i)].reverse().find((q) => !Number.isNaN(q.tx));
    p.tx = donor?.tx ?? 1;
    p.ty = donor?.ty ?? 0;
  }

  return { points, length: s, segmentLengths };
}
