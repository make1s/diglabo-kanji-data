import { describe, expect, it } from "vitest";
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
    });
  });
  it("学年なしは null、画数が複数なら最初", () => {
    const m = parseKanjidic2(XML);
    expect(m.get("亜")?.grade).toBe(8);
    expect(m.get("亜")?.strokeCount).toBe(7);
    expect(m.get("丂")).toEqual({ char: "丂", codepoint: "04e02", grade: null, strokeCount: 2, radicalClassical: 1, on: [], kun: [], meanings: [] });
    expect(m.size).toBe(3);
  });
  it("header の版を読む", () => {
    expect(readKanjidicHeader(XML)).toEqual({ fileVersion: "4", databaseVersion: "2026-248", dateOfCreation: "2026-09-05" });
  });
});
