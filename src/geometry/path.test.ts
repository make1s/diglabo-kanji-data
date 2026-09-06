import { describe, expect, it } from "vitest";
import { parseSvgPath } from "./path.js";

describe("parseSvgPath", () => {
  it("絶対 C を1本の3次ベジエにする", () => {
    expect(parseSvgPath("M10,20C15,25,20,30,25,35")).toEqual([[[10, 20], [15, 25], [20, 30], [25, 35]]]);
  });

  it("相対 c の連鎖を現在点から積む", () => {
    expect(parseSvgPath("M10,10c1,2,3,4,5,6c1,1,2,2,3,3")).toEqual([
      [[10, 10], [11, 12], [13, 14], [15, 16]],
      [[15, 16], [16, 17], [17, 18], [18, 19]],
    ]);
  });

  it("s は直前の第2制御点を現在点で反射した点を第1制御点にする", () => {
    const segs = parseSvgPath("M0,0C0,10,10,10,10,0s10,-10,10,0");
    expect(segs[1]).toEqual([[10, 0], [10, -10], [20, -10], [20, 0]]);
  });

  it("先頭の m は絶対座標として扱う", () => {
    const segs = parseSvgPath("m5,5c1,0,2,0,3,0");
    expect(segs[0]?.[0]).toEqual([5, 5]);
    expect(segs[0]?.[3]).toEqual([8, 5]);
  });

  it("L / l は両端を制御点に複製した退化ベジエにする", () => {
    expect(parseSvgPath("M0,0L10,0l0,5")).toEqual([
      [[0, 0], [0, 0], [10, 0], [10, 0]],
      [[10, 0], [10, 0], [10, 5], [10, 5]],
    ]);
  });

  it("負号で詰めた数値と暗黙の繰り返しを読む（KanjiVG の実データ）", () => {
    const segs = parseSvgPath("M37.25,20.25c0.24,1.93-0.07,4.46-0.83,6.12-4.89,10.56-11.58,20.95-22.79,33.79");
    expect(segs).toHaveLength(2);
    expect(segs[1]?.[3][0]).toBeCloseTo(37.25 - 0.83 - 22.79, 5);
    expect(segs[1]?.[3][1]).toBeCloseTo(20.25 + 6.12 + 33.79, 5);
  });

  it("未対応のコマンドは投げる", () => {
    expect(() => parseSvgPath("M0,0Q1,1,2,2")).toThrow(/Q/);
    expect(() => parseSvgPath("M0,0L1,1Z")).toThrow(/Z/);
  });
});
