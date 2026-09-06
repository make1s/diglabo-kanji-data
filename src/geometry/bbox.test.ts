import { describe, expect, it } from "vitest";
import { bboxOfPoints, unionBBox } from "./bbox.js";

describe("bbox", () => {
  it("点群の x,y,w,h を出す", () => {
    expect(bboxOfPoints([[1, 2], [3, -1], [2, 0]])).toEqual([1, -1, 2, 3]);
  });
  it("和をとる", () => {
    expect(unionBBox([0, 0, 1, 1], [2, 2, 1, 1])).toEqual([0, 0, 3, 3]);
  });
});
