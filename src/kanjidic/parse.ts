export interface KanjidicEntry {
  char: string;
  /** 5桁の小文字16進（KanjiVG のファイル名と同じ） */
  codepoint: string;
  /** 1..6 は教育漢字、8 は中学校、9/10 は人名用。無ければ null */
  grade: number | null;
  strokeCount: number;
  radicalClassical: number | null;
  on: string[];
  kun: string[];
  /** 英語の意味（m_lang 無しのものだけ） */
  meanings: string[];
  /** JIS X 0208 の水準（区 16〜47＝1・48〜84＝2）。jis208 の符号が無ければ null。⚠ variant の jis208 は別字の符号なので見ない */
  jisLevel: 1 | 2 | null;
}

export interface KanjidicHeader {
  fileVersion: string;
  databaseVersion: string;
  dateOfCreation: string;
}

function decode(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
}

function first(chunk: string, re: RegExp): string | null {
  const m = chunk.match(re);
  return m ? m[1]! : null;
}

function all(chunk: string, re: RegExp): string[] {
  return [...chunk.matchAll(re)].map((m) => decode(m[1]!));
}

export function readKanjidicHeader(xml: string): KanjidicHeader {
  const head = xml.slice(0, xml.indexOf("<character>"));
  const fileVersion = first(head, /<file_version>(.*?)<\/file_version>/);
  const databaseVersion = first(head, /<database_version>(.*?)<\/database_version>/);
  const dateOfCreation = first(head, /<date_of_creation>(.*?)<\/date_of_creation>/);
  if (!fileVersion || !databaseVersion || !dateOfCreation) throw new Error("KANJIDIC2 の header が読めない");
  return { fileVersion, databaseVersion, dateOfCreation };
}

/** JIS X 0208 の区 → 水準。第1水準は 16〜47 区、第2水準は 48〜84 区 */
export function jisLevelOfKu(ku: number | null): 1 | 2 | null {
  if (ku === null) return null;
  if (ku >= 16 && ku <= 47) return 1;
  if (ku >= 48 && ku <= 84) return 2;
  return null;
}

/** kanjidic2.xml を全字読む。正規表現で <character> を切る（DTD が固定なので XML パーサは要らない） */
export function parseKanjidic2(xml: string): Map<string, KanjidicEntry> {
  const map = new Map<string, KanjidicEntry>();
  for (const chunk of xml.split("<character>").slice(1)) {
    const body = chunk.slice(0, chunk.indexOf("</character>"));
    const char = first(body, /<literal>(.*?)<\/literal>/);
    const ucs = first(body, /<cp_value cp_type="ucs">(.*?)<\/cp_value>/);
    const strokeCount = first(body, /<stroke_count>(\d+)<\/stroke_count>/);
    if (!char || !ucs || !strokeCount) throw new Error(`KANJIDIC2 の項目が読めない: ${body.slice(0, 80)}`);
    const grade = first(body, /<grade>(\d+)<\/grade>/);
    const radical = first(body, /<rad_value rad_type="classical">(\d+)<\/rad_value>/);
    const ku = first(body, /<cp_value cp_type="jis208">1-(\d+)-\d+<\/cp_value>/);
    map.set(decode(char), {
      char: decode(char),
      codepoint: ucs.toLowerCase().padStart(5, "0"),
      grade: grade === null ? null : Number(grade),
      strokeCount: Number(strokeCount),
      radicalClassical: radical === null ? null : Number(radical),
      on: all(body, /<reading r_type="ja_on">(.*?)<\/reading>/g),
      kun: all(body, /<reading r_type="ja_kun">(.*?)<\/reading>/g),
      meanings: all(body, /<meaning>(.*?)<\/meaning>/g),
      jisLevel: jisLevelOfKu(ku === null ? null : Number(ku)),
    });
  }
  return map;
}
