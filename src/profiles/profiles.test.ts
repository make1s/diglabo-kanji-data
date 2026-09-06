import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveProfileKey } from "./resolve.js";
import { BASE_STROKE_TYPES, validateProfileTable, type ProfileTable } from "./types.js";

const table: ProfileTable = {
  version: 1,
  stemWidth: 6,
  profiles: {
    "㇐": { width: 1, start: "round", end: "round", keys: [[0, 1], [1, 1]] },
    "㇐a": { width: 1, start: "round", end: "flat", keys: [[0, 1], [1, 1]] },
    "㇔": { width: 1, start: "point", end: "round", keys: [[0, 0.5], [1, 1]] },
    "㇟": { width: 1, start: "round", end: "point", keys: [[0, 1], [1, 1]], endTaper: { lastSegment: true } },
    kana: { width: 0.9, start: "round", end: "round", keys: [[0, 1], [1, 1]] },
  },
};

describe("resolveProfileKey", () => {
  it("完全一致を最優先にする", () => {
    expect(resolveProfileKey("㇐a", table)).toBe("㇐a");
  });
  it("添字つきが無ければ基本形に落とす", () => {
    expect(resolveProfileKey("㇐b", table)).toBe("㇐");
  });
  it("「／」は左側で引く", () => {
    expect(resolveProfileKey("㇔／㇏", table)).toBe("㇔");
    expect(resolveProfileKey("㇔/㇏", table)).toBe("㇔");
  });
  it("左側の添字も落とす", () => {
    expect(resolveProfileKey("㇟a／㇏", table)).toBe("㇟");
  });
  it("型なしは kana", () => {
    expect(resolveProfileKey(null, table)).toBe("kana");
    expect(resolveProfileKey("", table)).toBe("kana");
  });
  it("どれにも無ければ投げる", () => {
    expect(() => resolveProfileKey("㇞", table)).toThrow(/㇞/);
  });
});

describe("validateProfileTable", () => {
  it("keys は 0 始まり 1 終わりで単調", () => {
    const bad = structuredClone(table);
    bad.profiles["㇐"]!.keys = [[0, 1], [0.5, 1], [0.9, 1]];
    expect(() => validateProfileTable(bad)).toThrow(/keys/);
    bad.profiles["㇐"]!.keys = [[0, 1], [0.6, 1], [0.5, 1], [1, 1]];
    expect(() => validateProfileTable(bad)).toThrow(/keys/);
  });
  it("倍率と太さは正", () => {
    const bad = structuredClone(table);
    bad.profiles["㇐"]!.width = 0;
    expect(() => validateProfileTable(bad)).toThrow(/width/);
  });
  it("実際の設計図の表は基本 25 種と kana を全部持ち、検証を通る", () => {
    const json = JSON.parse(readFileSync(new URL("../../data/stroke-profiles.json", import.meta.url), "utf8"));
    const real = validateProfileTable(json);
    expect(BASE_STROKE_TYPES).toHaveLength(25);
    for (const t of BASE_STROKE_TYPES) expect(real.profiles[t], t).toBeDefined();
    expect(real.profiles["kana"]).toBeDefined();
  });
});
