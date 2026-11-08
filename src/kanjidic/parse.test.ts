import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { parseKanjidic2, readKanjidicHeader } from "./parse.js";

const XML = `<?xml version="1.0" encoding="UTF-8"?>
<kanjidic2>
<header>
<!-- KANJIDIC 2 - XML format kanji database -->
<file_version>4</file_version>
<database_version>2026-248</database_version>
<date_of_creation>2026-09-05</date_of_creation>
</header>
<!-- Entry for Kanji: 化 -->
<character>
<literal>化</literal>
<codepoint>
<cp_value cp_type="ucs">5316</cp_value>
<cp_value cp_type="jis208">1-18-29</cp_value>
</codepoint>
<radical>
<rad_value rad_type="classical">21</rad_value>
<rad_value rad_type="nelson_c">9</rad_value>
</radical>
<misc>
<grade>3</grade>
<stroke_count>4</stroke_count>
<freq>221</freq>
<jlpt>2</jlpt>
</misc>
<reading_meaning>
<rmgroup>
<reading r_type="pinyin">hua4</reading>
<reading r_type="korean_r">hwa</reading>
<reading r_type="ja_on">カ</reading>
<reading r_type="ja_on">ケ</reading>
<reading r_type="ja_kun">ば.ける</reading>
<reading r_type="ja_kun">ば.かす</reading>
<reading r_type="ja_kun">ふ.ける</reading>
<reading r_type="ja_kun">け.する</reading>
<meaning>change</meaning>
<meaning>take the form of</meaning>
<meaning m_lang="fr">changer</meaning>
</rmgroup>
<nanori>け</nanori>
</reading_meaning>
</character>
<!-- Entry for Kanji: 亜 -->
<character>
<literal>亜</literal>
<codepoint>
<cp_value cp_type="ucs">4e9c</cp_value>
</codepoint>
<radical>
<rad_value rad_type="classical">7</rad_value>
</radical>
<misc>
<grade>8</grade>
<stroke_count>7</stroke_count>
<stroke_count>8</stroke_count>
</misc>
<reading_meaning>
<rmgroup>
<reading r_type="ja_on">ア</reading>
<meaning>Asia</meaning>
</rmgroup>
</reading_meaning>
</character>
<character>
<literal>丂</literal>
<codepoint><cp_value cp_type="ucs">4e02</cp_value></codepoint>
<radical><rad_value rad_type="classical">1</rad_value></radical>
<misc><stroke_count>2</stroke_count></misc>
</character>
</kanjidic2>`;

describe("parseKanjidic2", () => {
  it("化: 学年・画数・部首・音訓・英語の意味", () => {
    const m = parseKanjidic2(XML);
    const e = m.get("化")!;
    expect(e).toEqual({
      char: "化",
      codepoint: "05316",
      grade: 3,
      strokeCount: 4,
      radicalClassical: 21,
      on: ["カ", "ケ"],
      kun: ["ば.ける", "ば.かす", "ふ.ける", "け.する"],
      meanings: ["change", "take the form of"],
      jisLevel: 1,
    });
  });
  it("学年なしは null、画数が複数なら最初", () => {
    const m = parseKanjidic2(XML);
    expect(m.get("亜")?.grade).toBe(8);
    expect(m.get("亜")?.strokeCount).toBe(7);
    expect(m.get("丂")).toEqual({ char: "丂", codepoint: "04e02", grade: null, strokeCount: 2, radicalClassical: 1, on: [], kun: [], meanings: [], jisLevel: null });
    expect(m.size).toBe(3);
  });
  it("header の版を読む", () => {
    expect(readKanjidicHeader(XML)).toEqual({ fileVersion: "4", databaseVersion: "2026-248", dateOfCreation: "2026-09-05" });
  });
});

describe("jisLevel（JIS X 0208 の水準）", () => {
  const entry = (literal: string, ucs: string, codepoint: string) => `<character>
<literal>${literal}</literal>
<codepoint>
<cp_value cp_type="ucs">${ucs}</cp_value>
${codepoint}
</codepoint>
<misc><stroke_count>1</stroke_count></misc>
</character>`;
  const xml = `<kanjidic2><header></header>
${entry("亜", "4e9c", '<cp_value cp_type="jis208">1-16-01</cp_value>')}
${entry("弌", "5f0c", '<cp_value cp_type="jis208">1-48-02</cp_value>')}
${entry("丂", "4e02", '<cp_value cp_type="jis212">1-16-02</cp_value>')}
${entry("丄", "4e04", "")}
</kanjidic2>`;
  // ⚠ <variant var_type="jis208"> は別字の符号なので見ない（拾うと水準1が 1,371 字に化けた。2026-11-08）
  const withVariant = xml.replace("</kanjidic2>", `${entry("丅", "4e05", "").replace("</codepoint>", "</codepoint>\n<misc><variant var_type=\"jis208\">1-20-01</variant></misc>")}\n</kanjidic2>`);

  it("区 16〜47 は 1、48〜84 は 2、jis208 の符号が無ければ null", () => {
    const map = parseKanjidic2(xml);
    expect(map.get("亜")!.jisLevel).toBe(1);
    expect(map.get("弌")!.jisLevel).toBe(2);
    expect(map.get("丂")!.jisLevel).toBeNull();
    expect(map.get("丄")!.jisLevel).toBeNull();
  });

  it("variant の jis208 は水準に数えない", () => {
    expect(parseKanjidic2(withVariant).get("丅")!.jisLevel).toBeNull();
  });

  const real = new URL("../../input/kanjidic2.xml", import.meta.url);
  const mextFile = new URL("../../data/mext-onkun-2017.json", import.meta.url);
  it.skipIf(!existsSync(real))("実物: 常用漢字を除くと水準1が 863 字・水準2が 3,360 字", () => {
    const map = parseKanjidic2(readFileSync(real, "utf8"));
    const joyo = new Set((JSON.parse(readFileSync(mextFile, "utf8")) as { entries: { kanji: string }[] }).entries.map((e) => e.kanji));
    const count = (lv: 1 | 2) => [...map.values()].filter((e) => e.jisLevel === lv && !joyo.has(e.char)).length;
    expect(count(1)).toBe(863);
    expect(count(2)).toBe(3360);
  });
});
