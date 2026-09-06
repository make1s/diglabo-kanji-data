// ブラウザでも使える純粋な幾何。Node の import をここに足さないこと。
export { parseSvgPath } from "./path.js";
export type { CubicSegment, Point } from "./path.js";
export { sampleCenterline } from "./sample.js";
export type { Sample, Sampled } from "./sample.js";
export { buildOutline, simplifyPolyline, toPathD, widthAt } from "./outline.js";
export { bboxOfPoints, unionBBox } from "./bbox.js";
export type { BBox } from "./bbox.js";
export { resolveProfileKey, UNTYPED_KEY } from "../profiles/resolve.js";
export { BASE_STROKE_TYPES, validateProfileTable } from "../profiles/types.js";
export type { Cap, EndTaper, ProfileTable, StrokeProfile } from "../profiles/types.js";
