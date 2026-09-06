/** 2次元の点 [x, y] */
export type Point = [number, number];
/** 3次ベジエ1本 [始点, 制御点1, 制御点2, 終点] */
export type CubicSegment = [Point, Point, Point, Point];

const TOKEN = /[A-Za-z]|[-+]?(?:\d*\.\d+|\d+\.?)(?:[eE][-+]?\d+)?/g;
const SUPPORTED = new Set(["M", "m", "C", "c", "S", "s", "L", "l"]);

/**
 * SVG の path `d` を3次ベジエの列にする。
 * KanjiVG が使うのは M/m・C/c・S/s だけ（教育漢字 9,662 画とかな 515 画の実測）。L/l は退化ベジエとして受ける。
 * 直線は [p0, p0, p1, p1] に写す（制御点が端に重なる）。
 */
export function parseSvgPath(d: string): CubicSegment[] {
  const tokens = d.match(TOKEN) ?? [];
  const segs: CubicSegment[] = [];
  let cmd: string | null = null;
  let cur: Point = [0, 0];
  let started = false;
  let prevC2: Point | null = null;
  let i = 0;

  const num = (): number => {
    const t = tokens[i++];
    if (t === undefined || /[A-Za-z]/.test(t)) throw new Error(`パスの数値が足りない: ${d}`);
    return Number(t);
  };
  const point = (rel: boolean): Point => {
    const x = num();
    const y = num();
    return rel ? [cur[0] + x, cur[1] + y] : [x, y];
  };

  while (i < tokens.length) {
    const t = tokens[i]!;
    if (/[A-Za-z]/.test(t)) {
      if (!SUPPORTED.has(t)) throw new Error(`未対応のパスコマンド ${t}: ${d}`);
      cmd = t;
      i++;
      continue;
    }
    switch (cmd) {
      case "M":
      case "m": {
        cur = point(cmd === "m" && started);
        started = true;
        prevC2 = null;
        cmd = cmd === "m" ? "l" : "L";
        break;
      }
      case "C":
      case "c": {
        const rel = cmd === "c";
        const c1 = point(rel);
        const c2 = point(rel);
        const e = point(rel);
        segs.push([cur, c1, c2, e]);
        prevC2 = c2;
        cur = e;
        break;
      }
      case "S":
      case "s": {
        const rel = cmd === "s";
        const c2 = point(rel);
        const e = point(rel);
        const c1: Point = prevC2 ? [2 * cur[0] - prevC2[0], 2 * cur[1] - prevC2[1]] : cur;
        segs.push([cur, c1, c2, e]);
        prevC2 = c2;
        cur = e;
        break;
      }
      case "L":
      case "l": {
        const e = point(cmd === "l");
        segs.push([cur, cur, e, e]);
        prevC2 = null;
        cur = e;
        break;
      }
      default:
        throw new Error(`コマンドの前に数値がある: ${d}`);
    }
  }
  return segs;
}
