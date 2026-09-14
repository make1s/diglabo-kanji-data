/** 単調な区間で太さが逆戻りしない、傾きを共有した3次Hermite補間。 */
export function makeWidthCurve(keys: readonly (readonly [number, number])[]): (u: number) => number {
  if (keys.length < 2) throw new Error("幅曲線には2点以上が必要");
  const spans: number[] = [];
  const secants: number[] = [];
  for (let i = 0; i < keys.length - 1; i++) {
    const h = keys[i + 1]![0] - keys[i]![0];
    if (!(h > 0)) throw new Error("幅曲線の位置は単調増加が必要");
    spans.push(h);
    secants.push((keys[i + 1]![1] - keys[i]![1]) / h);
  }
  const slopes = [secants[0]!];
  for (let i = 1; i < keys.length - 1; i++) {
    const before = secants[i - 1]!;
    const after = secants[i]!;
    const w1 = 2 * spans[i]! + spans[i - 1]!;
    const w2 = spans[i]! + 2 * spans[i - 1]!;
    slopes.push(before * after <= 0 ? 0 : (w1 + w2) / (w1 / before + w2 / after));
  }
  slopes.push(secants.at(-1)!);
  return (u: number): number => {
    if (u <= keys[0]![0]) return keys[0]![1];
    for (let i = 0; i < spans.length; i++) {
      if (u > keys[i + 1]![0]) continue;
      const t = (u - keys[i]![0]) / spans[i]!;
      const t2 = t * t;
      const t3 = t2 * t;
      return (2*t3 - 3*t2 + 1)*keys[i]![1]
        + (t3 - 2*t2 + t)*spans[i]!*slopes[i]!
        + (-2*t3 + 3*t2)*keys[i+1]![1]
        + (t3 - t2)*spans[i]!*slopes[i+1]!;
    }
    return keys.at(-1)![1];
  };
}
