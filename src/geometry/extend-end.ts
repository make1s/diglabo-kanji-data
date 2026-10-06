import type { StrokeProfile } from "../profiles/types.js";
import type { Sampled } from "./sample.js";

/** 終筆の接線を保って短く延ばす。元の点列・始端・折れ・曲線を動かさない。 */
export function extendStrokeEnd(a: Sampled, profile: StrokeProfile, stem: number): Sampled {
  const extension = profile.endExtension;
  const end = a.points.at(-1);
  if (!extension || profile.end !== "point" || !end || a.length <= 0) return a;
  const distance = Math.min(a.length * extension.fraction, stem * extension.maxWidth);
  if (distance <= 0) return a;
  const steps = Math.max(1, Math.ceil(distance / 0.3));
  const points = [...a.points];
  for (let i = 1; i <= steps; i++) {
    const d = distance * i / steps;
    points.push({ ...end, x: end.x + end.tx * d, y: end.y + end.ty * d, s: end.s + d });
  }
  const segmentLengths = [...a.segmentLengths];
  // 既存の lastSegment 型の細まりも、元の曲線から新しい先端まで連続させる。
  if (segmentLengths.length) segmentLengths[segmentLengths.length - 1]! += distance;
  return { points, length: a.length + distance, segmentLengths };
}
