# diglabo-kanji-data

教育漢字 1,026 字とかな 177 字について、**字形・書き順・筆圧つきアウトライン・部品階層・教育用読み** を持つ JSON データセット。
[diglabo](https://diglabo.com) の漢字ドリルのお手本と書き順アニメーションのために生成し、**CC BY-SA 4.0** で公開する。

- 字形と書き順は [KanjiVG](http://kanjivg.tagaini.net)（CC BY-SA 3.0）の既定字形
- 学年・画数・部首・読み・意味は [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)（EDRDG, CC BY-SA 4.0）
- 教育用読み（小学校で習う読み）は文部科学省「[音訓の小・中・高等学校段階別割り振り表（平成29年3月）](https://www.mext.go.jp/a_menu/shotou/new-cs/1385768.htm)」

帰属の詳細と、印刷物に載せる1行は [ATTRIBUTION.md](./ATTRIBUTION.md)。

## 何が入っているか

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
  "meanings": ["change", "take the form of", "..."],
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

## 筆圧つきアウトラインの決め方

太さは **画種ごとの設計図** `data/stroke-profiles.json` だけで決まり、**字ごとの上書きは持たない**。
KanjiVG の `kvg:type`（添字込み 69 通り）から 完全一致 → 「／」の左側 → 添字を落とした基本形 25 種 の順で設計図を引き、型の無い画（かな）は `kana` を使う。

```jsonc
"㇚": { "width": 1.0, "start": "round", "end": "point", "keys": [[0, 1], [1, 1]], "endTaper": { "lastSegment": true, "ease": 0.6 } }
```

太さ `w(s) = stemWidth × width × keys(s/L) × taper(s)`。`keys` は弧長比率→倍率の折れ線、`endTaper` は終端で 1→0 に落とす領域
（`lastSegment` は最後の3次ベジエ1本＝KanjiVG は はね を最後のセグメントとして分けて描く）。`start`/`end` は `round`（とめ）・`flat`・`point`（はらい・はね）。
見た目が変な画種は設計図を直して全字に効かせる。幾何は `src/geometry/` にあり Node に依存しないので、ブラウザの書き順アニメーションでも同じコードで描ける。

## 使い方

```bash
pnpm install
pnpm fetch        # input/ に KanjiVG r20250816・kanjidic2.xml・文科省 PDF を取得（pdftotext が要る）
pnpm mext         # PDF → data/mext-onkun-2017.json（検証つき）
pnpm build:data   # dist/ を生成。警告は build/report.json
pnpm overview     # 目視用: build/overview-kanji.png（学年順の 1,026 字）・overview-kana.png・overview-types.html（画種別サンプル）・overview-radicals.html（部首の呼び名と部首の画）
pnpm test
```

## 版

`package.json` の `version` がデータセットの版で、`dist/index.json` に写る。入力の版を上げたとき・設計図を変えたときに上げ、タグ `vX.Y.Z` で GitHub Release を切る。

## 既知の制限

- 都道府県名にだけ使う読み（岐阜の「ぎ」、大阪の「さか」など、割り振り表の付表２）は入っていない
- かなは `kvg:type` が無いので一律の設計図。第1リリースの紙には出さない
- 割り振り表の PDF で「𠮟」だけ文字層に無く、変換スクリプトで読みを戻している

## ライセンス

データセット全体は [CC BY-SA 4.0](./LICENSE)。KanjiVG（CC BY-SA 3.0）は同ライセンス §4(b) により後の版で改変物を配布できる。
生成コード（`src/`, `scripts/`）も同じライセンスで配る。
