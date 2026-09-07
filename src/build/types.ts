import type { BBox } from "../geometry/bbox.js";

export type CharKind = "kanji" | "hiragana" | "katakana";

export interface StrokeRecord {
  /** 画番号（1 始まり） */
  n: number;
  /** kvg:type そのまま。無ければ null */
  type: string | null;
  /** 実際に使った設計図の鍵 */
  profile: string;
  /** KanjiVG の中心線（path d） */
  centerline: string;
  /** 筆圧つきの閉じた多角形（path d、小数1桁） */
  outline: string;
  /** 中心線の弧長 */
  length: number;
  /** 画番号の表示位置（KanjiVG 同梱） */
  numberAt: [number, number];
  /** アウトラインの x, y, w, h */
  bbox: BBox;
}

export interface PartNode {
  element?: string;
  original?: string;
  variant?: true;
  position?: string;
  radical?: string;
  phon?: string;
  part?: number;
  number?: number;
  partial?: true;
  tradForm?: true;
  radicalForm?: true;
  /** 含む画番号（子孫も含む） */
  strokes: number[];
  bbox: BBox;
  children: PartNode[];
}

/** 部首の位置は KanjiVG の position（left / right / top / bottom / tare / nyo / kamae と その変形）*/
export interface RadicalRecord {
  /** KANJIDIC2 の部首（康熙）番号 */
  number: number | null;
  /** 部首の字形（「木」「氵」）。紙面の部首欄に出す字 */
  element: string;
  /** 字の中での位置。呼び名の分岐に使う。位置の指定が無ければ null */
  position: string | null;
  /** 日本語の呼び名（「きへん」）。data/radical-names.json に無ければ null */
  name: string | null;
  /** 部首にあたる画の番号（1 始まり）。ここだけ濃く描けば「どこが部首か」を示せる */
  strokes: number[];
  /** KanjiVG のどの印から取ったか。general＝その字の部首、tradit/nelson＝流派の部首 */
  source: "general" | "tradit" | "nelson";
}

export interface CharRecord {
  char: string;
  /** 5桁の小文字16進 */
  codepoint: string;
  kind: CharKind;
  /** 学年 1..6（かなは null） */
  grade: number | null;
  /** KanjiVG の画数 */
  strokeCount: number;
  /** 部首。康熙番号に加えて、字形・位置・呼び名・部首にあたる画を持つ（かなは null） */
  radical: RadicalRecord | null;
  /** KANJIDIC2 の全読み */
  readings: { on: string[]; kun: string[] };
  /** 小学校段階の読み（割り振り表の順。紙は先頭から6つまで） */
  eduReadings: { on: string[]; kun: string[] };
  /** 割り振り表で1字下げだった読み（eduReadings にも入っている） */
  eduReadingsSpecial: string[];
  /** KANJIDIC2 の英語の意味 */
  meanings: string[];
  viewBox: [0, 0, 109, 109];
  strokes: StrokeRecord[];
  parts: PartNode;
}

export interface DatasetIndex {
  version: string;
  generatedAt: string;
  license: "CC-BY-SA-4.0";
  sources: {
    kanjivg: { release: string; license: "CC-BY-SA-3.0"; url: string };
    kanjidic2: { databaseVersion: string; dateOfCreation: string; license: "CC-BY-SA-4.0"; url: string };
    mext: { title: string; url: string };
  };
  profilesVersion: number;
  counts: { kanji: number; hiragana: number; katakana: number; strokes: number };
  chars: { char: string; codepoint: string; kind: CharKind; grade: number | null; strokeCount: number }[];
}
