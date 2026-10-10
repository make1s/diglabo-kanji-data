# 文字データの形式

[READMEへ戻る](../README.md) · [文字データnpm](../packages/data/README.md)

以下のパスはリポジトリのルートからの相対パスです。

`dist/index.json` が索引、`dist/chars/{codepoint}.json` が1字1ファイル。座標系は KanjiVG のまま `viewBox 0 0 109 109`。

```jsonc
// dist/chars/05316.json（化）抜粋
{
  "char": "化", "codepoint": "05316", "kind": "kanji",
  "grade": 3, "strokeCount": 4,
  "radical": { "number": 21, "element": "匕", "position": "right", "name": "ひ", "strokes": [3, 4], "source": "tradit" },
  "readings":    { "on": ["カ", "ケ"], "kun": ["ば.ける", "ば.かす", "ふ.ける", "け.する"] },  // KANJIDIC2 の全読み
  "eduReadings": { "on": ["カ"],       "kun": ["ば.ける", "ば.かす"] },                       // 小学校段階の読み
  "eduReadingsSpecial": [],       // 割り振り表で1字下げ（特別・用法が狭い）だった読み
  "readingStages": { "on": [{ "reading": "カ", "stage": "elementary" }, { "reading": "ケ", "stage": "junior" }],
                     "kun": [{ "reading": "ば.ける", "stage": "elementary" }, { "reading": "ば.かす", "stage": "elementary" }] },
  "meanings": ["change", "take the form of", "..."],
  "variants": [],                 // 一般の字体（検索用の別名）。𠮟・塡・剝・頰 だけが持つ
  "viewBox": [0, 0, 109, 109],
  "strokes": [
    { "n": 1, "type": "㇒", "profile": "㇒",
      "centerline": "M37.25,20.25c0.24,...",   // KanjiVG の中心線（書き順アニメーション用）
      "outline": "M34.2,20.6L34.1,23L...Z",      // 筆圧つきの閉じた多角形（塗ればお手本）
      "length": 47.1, "numberAt": [27.25, 21.13], "bbox": [13.63, 17.23, 26.76, 43.0] }
  ],
  "parts": {                       // KanjiVG の部品階層（パズル用）。strokes は含む画番号、bbox はアウトラインの外接矩形
    "element": "化", "strokes": [1, 2, 3, 4], "bbox": [13.63, 12.67, 82.1, 83.34],
    "children": [
      { "element": "亻", "original": "人", "variant": true, "position": "left", "radical": "nelson", "strokes": [1, 2], "bbox": [...], "children": [] },
      { "element": "匕", "position": "right", "radical": "tradit", "strokes": [3, 4], "bbox": [...], "children": [] }
    ]
  }
}
```

- `kind` は `kanji` / `hiragana`（U+3041〜3096）/ `katakana`（U+30A1〜30FA と長音符 U+30FC）。かなは `grade` `radical` が null で読みは空
- 字集合は常用漢字表の 2,136 字（割り振り表の字）。`grade` は配当学年で、教育漢字だけが持つ。中学で習う字は `null`（KANJIDIC2 の 8 は写さない）
- `readingStages` は割り振り表の段階つきの読み。小学校は `eduReadings`（手当て済み）、中学・高校は KANJIDIC2 の表記に写し、写せなければ表の表記のまま
- `variants` は常用漢字表の字体と符号位置が違う 4 字（𠮟・塡・剝・頰）の一般の字体（叱・填・剥・頬）。本体は常用漢字表の字体
- `radical` は KANJIDIC2 の康熙番号（`number`）に、KanjiVG から取った 字形・位置・部首にあたる画番号 を重ねたもの。
  `strokes` だけ濃く描けば「その字のどこが部首か」を示せる（紙面の部首欄はこの形で出す）。
  `source` は KanjiVG のどの印から取ったかで、`general`（その字の部首）が 812 字、残り 214 字は伝統部首 `tradit`。
  呼び名 `name`（「きへん」）だけは KANJIDIC2 にも KanjiVG にも無いので `data/radical-names.json`（字形 × 位置、189 字形）で与える。
  呼び名は漢字ペディア（日本漢字能力検定協会）の部首索引に載るものだけを使い、複数あるときは小学生になじみのある方を採る。
  KanjiVG の部品と KANJIDIC2 の部首がずれる 7 字（全・申・由・書・曲・最・夏）も、`strokes` が指す位置は辞典の部首と一致する
  （「申」なら部首の田が字のほぼ全体）ことを目視で確かめてある。変えたら `build/overview-radicals.html` を目視する
- `eduReadings` は割り振り表の順（主要な読みが先、1字下げの読みは末尾）。紙に載せるときは先頭から6つまでを目安にする（「生」のように小学校段階だけで 10 個ある字がある）
- 送り仮名の区切りは KANJIDIC2 の記法（`ば.ける` の `.`）。割り振り表に無い区切りは KANJIDIC2 から写しているので、`data/edu-readings-overrides.json` で 3 字だけ手当てしている
- `dist/index.json` の `sources` に入力の版（KanjiVG のリリース、KANJIDIC2 の database_version）を記録する
- `dist/fonts/tehon.woff2` は全 2,313 字に、文字データに入れない常用外の 10 字（`data/tehon-extra-chars.json`）を加えた 2,323 字の筆圧アウトラインを塗った手本フォント（family `DiglaboTehon`・UPM 1000・y は上向き）。`dist/fonts/manifest.json` に版・sha256・字数と、フォントだけの字の一覧 `extraChars` を書く。
  バイト列は輪郭だけで決まる（作成・更新日時は固定、版番号は入れない）ので、版を上げても字形が同じなら sha256 は変わらない。
  1 グリフに画を重ねたまま入れている（重なりは除いていない）。1 画ずつ色を変える・画番号を出す用途には `strokes[].outline` を使う
