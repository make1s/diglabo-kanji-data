/**
 * 文部科学省「音訓の小・中・高等学校段階別割り振り表（平成29年3月）」を pdftotext -tsv の出力から読む。
 *
 * 紙面の事実（pt）: 3段組で段の原点 x = 70 / 310 / 550。段内の相対 x は 漢字 0、学年 +25、読み +50（1字下げ＝特別な音訓は +56）、
 * ○ は +120（小学校）/ +165（中学校）/ +205（高等学校）。行は y でまとまる。付表１（熟字訓）以降のページは読まない。
 */
export type Stage = "elementary" | "junior" | "senior";

export interface MextReading {
  reading: string;
  kind: "on" | "kun";
  stage: Stage;
  /** 表で1字下げ（特別なもの、又は用法のごく狭いもの） */
  special: boolean;
}

export interface MextEntry {
  kanji: string;
  /** 学年別漢字配当表の学年。配当外は null */
  grade: number | null;
  readings: MextReading[];
}

export interface MextTable {
  entries: MextEntry[];
  warnings: string[];
}

interface Word {
  page: number;
  x: number;
  y: number;
  text: string;
}

const COLUMN_X = [70, 310, 550];
const COLUMN_WIDTH = 220;
const REL = { kanji: 0, grade: 25, reading: 50, specialFrom: 53.5, readingMax: 66 };
const STAGES: [Stage, number][] = [
  ["elementary", 120],
  ["junior", 165],
  ["senior", 205],
];
const STAGE_TOLERANCE = 13;
const LINE_TOLERANCE = 3;

const isKanji = (t: string): boolean => /^\p{Script=Han}$/u.test(t); // 𠮟（U+20B9F）は BMP の外
const isKana = (t: string): boolean => /^[ぁ-ゖァ-ヺー]+$/u.test(t);
const isKatakana = (t: string): boolean => /^[ァ-ヺー]+$/u.test(t);
const gradeOf = (t: string): number | null => (/^[0-9０-９]$/.test(t) ? Number(t.replace(/[０-９]/, (c) => String(c.charCodeAt(0) - 0xff10))) : null);

function readWords(tsv: string): Word[] {
  const lines = tsv.split("\n");
  const out: Word[] = [];
  for (const line of lines.slice(1)) {
    const c = line.split("\t");
    if (c.length < 12) continue;
    const text = c[11]!.trim();
    if (!text || text.startsWith("###")) continue;
    out.push({ page: Number(c[1]), x: Number(c[6]), y: Number(c[7]), text });
  }
  return out;
}

function groupLines(words: Word[]): Word[][] {
  const sorted = [...words].sort((a, b) => a.page - b.page || a.y - b.y || a.x - b.x);
  const lines: Word[][] = [];
  let current: Word[] = [];
  for (const w of sorted) {
    const head = current[0];
    if (head && (w.page !== head.page || w.y - head.y > LINE_TOLERANCE)) {
      lines.push(current);
      current = [];
    }
    current.push(w);
  }
  if (current.length) lines.push(current);
  return lines;
}

function stageOf(rel: number): Stage | null {
  let best: Stage | null = null;
  let bestDist = STAGE_TOLERANCE;
  for (const [stage, x] of STAGES) {
    const d = Math.abs(rel - x);
    if (d <= bestDist) {
      bestDist = d;
      best = stage;
    }
  }
  return best;
}

export interface MextWord {
  word: string;
  reading: string;
  stage: Stage;
}

export interface MextAppendix {
  jukujikun: MextWord[];
  prefectures: MextWord[];
  warnings: string[];
}

// 付表１・付表２ は本表と同じ3段組・同じ○の位置だが、語（熟字訓・都道府県名）は1マスに収まらず
// 学年欄が無いぶん本表よりわずかに右へ寄る（列ごとに 70/310/550 からの実際のずれが -2〜-7pt と段によって違う）。
// 読みの列もその分だけ動くので、window は3段とも余裕を持たせている（実測: 52.5〜57.5pt）
const APPENDIX_REL = { word: -2, readingMin: 47, readingMax: 80 };

/**
 * 文科省「音訓の小・中・高等学校段階別割り振り表」の付表１（熟字訓）・付表２（都道府県名）を読む。
 * 付表２は52ページの「付表２」見出しの行から始まる。付表１の続きが同じページの1段目に載っているため、
 * ページでなく「見出しと同じ行以降・同じ段」で判定する。
 *
 * ⚠ 海女／海士・叔父／伯父 のように同じ読みを別表記で載せる行は、読みと○を持たず直前行と{ブレース}で
 * まとめて印字される（TSVには何も出ない）。そのときは同じ段の直前に読み取った読み・段階を引き継ぐ。
 * ⚠ 「師走」の読み「しわす」には注記「（「しはす」とも言う。）」が付き、はみ出した続きが次の行に回るが
 * groupLines の行判定（先頭語からの y 差）で同じ行にまとまる。読みは先頭のかな連続だけを取る。
 */
export function parseMextAppendix(tsv: string): MextAppendix {
  const words = readWords(tsv);
  const page1 = Math.min(...words.filter((w) => /^付表[１1]$/.test(w.text)).map((w) => w.page));
  const head2 = words.find((w) => /^付表[２2]$/.test(w.text));
  if (!Number.isFinite(page1) || !head2) throw new Error("付表１・付表２ の見出しが見つからない");

  const jukujikun: MextWord[] = [];
  const prefectures: MextWord[] = [];
  const warnings: string[] = [];
  const isWord = (t: string): boolean => /^[\p{Script=Han}ぁ-ゖー々]+$/u.test(t) && /\p{Script=Han}/u.test(t);
  const kanaPrefixOf = (t: string): string => t.match(/^[ぁ-ゖァ-ヺー]+/u)?.[0] ?? "";
  // 段（COLUMN_X の各値）ごとに、直前に読み取った読み・段階を覚えておく（ブレースで共有する行の引き継ぎ用）
  const lastByColumn = new Map<number, { reading: string; stage: Stage }>();

  for (const line of groupLines(words.filter((w) => w.page >= page1))) {
    for (const base of COLUMN_X) {
      // 本表の -6 だと3段目の語（実測 base-6.8pt）を取りこぼすので、付表は -10 まで広げる
      const ws = line.filter((w) => w.x >= base - 10 && w.x < base + COLUMN_WIDTH).map((w) => ({ ...w, rel: w.x - base }));
      if (ws.length === 0) continue;
      if (ws.some((w) => w.text === "字" && w.rel >= 12 && w.rel <= 22)) continue; // 見出し行「漢 字  音 訓」
      const word = ws.find((w) => Math.abs(w.rel - APPENDIX_REL.word) <= 5 && isWord(w.text));
      if (!word) continue;

      const readingWord = ws.find((w) => w.rel >= APPENDIX_REL.readingMin && w.rel <= APPENDIX_REL.readingMax && kanaPrefixOf(w.text).length > 0);
      const circle = ws.find((w) => w.text === "○");
      let reading = readingWord ? kanaPrefixOf(readingWord.text) : null;
      let stage = circle ? stageOf(circle.rel) : null;

      if (!readingWord && !circle) {
        // 読み・○ともに無い＝ブレースで直前行と同じ読みを共有している
        const prev = lastByColumn.get(base);
        if (prev) {
          reading = prev.reading;
          stage = prev.stage;
        }
      }
      if (!reading || !stage) {
        warnings.push(`p${word.page} ${word.text}: 読みか○が無い`);
        continue;
      }
      lastByColumn.set(base, { reading, stage });

      // 付表２は「付表２」の見出しと同じページ・同じ段で、見出しより下の行から
      const isPref = word.page > head2.page || (word.page === head2.page && word.y > head2.y && word.x >= head2.x - 10);
      (isPref ? prefectures : jukujikun).push({ word: word.text, reading, stage });
    }
  }
  return { jukujikun, prefectures, warnings };
}

export function parseMextTsv(tsv: string): MextTable {
  const words = readWords(tsv);
  const appendixPage = Math.min(...words.filter((w) => /^付表[１1]$/.test(w.text)).map((w) => w.page), Number.POSITIVE_INFINITY);
  const body = words.filter((w) => w.page < appendixPage);
  const entries: MextEntry[] = [];
  const warnings: string[] = [];
  // 表の流れは「段の上→下 → 次の段 → 次のページ」。段やページの先頭に前の字の続きの読みが来るので、1本の current で追う
  const pages = new Map<number, Word[][]>();
  for (const line of groupLines(body)) {
    const page = line[0]!.page;
    if (!pages.has(page)) pages.set(page, []);
    pages.get(page)!.push(line);
  }
  let current: MextEntry | null = null;

  for (const page of [...pages.keys()].sort((a, b) => a - b)) {
    const lines = pages.get(page)!;
    COLUMN_X.forEach((base) => {
      for (const line of lines) {
        const ws = line.filter((w) => w.x >= base - 6 && w.x < base + COLUMN_WIDTH).map((w) => ({ ...w, rel: w.x - base }));
        if (ws.length === 0) continue;
        if (ws.some((w) => w.text === "字" && w.rel >= 12 && w.rel <= 22)) continue; // 見出し行「漢 字  音 訓」
        const kanji = ws.find((w) => Math.abs(w.rel - REL.kanji) <= 5 && isKanji(w.text));
        const grade = ws.find((w) => Math.abs(w.rel - REL.grade) <= 6 && gradeOf(w.text) !== null);
        const reading = ws.find((w) => w.rel >= REL.reading - 4 && w.rel <= REL.readingMax && isKana(w.text));
        const circle = ws.find((w) => w.text === "○");
        if (kanji) {
          current = { kanji: kanji.text, grade: grade ? gradeOf(grade.text) : null, readings: [] };
          entries.push(current);
        }
        if (!reading) {
          if (circle) warnings.push(`p${circle.page} y${circle.y.toFixed(0)} x${circle.x.toFixed(0)}: ○はあるが読みが無い（${ws.map((w) => w.text).join(" ")}）`);
          continue;
        }
        if (!current) {
          warnings.push(`p${reading.page} y${reading.y.toFixed(0)}: 漢字の前に読み「${reading.text}」がある`);
          continue;
        }
        const stage = circle ? stageOf(circle.rel) : null;
        if (!stage) {
          warnings.push(`${current.kanji} ${reading.text}: ○が無い（p${reading.page} y${reading.y.toFixed(0)}）`);
          continue;
        }
        current.readings.push({ reading: reading.text, kind: isKatakana(reading.text) ? "on" : "kun", stage, special: reading.rel > REL.specialFrom });
      }
    });
  }
  return { entries, warnings };
}
