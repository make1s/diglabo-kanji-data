# diglabo-kanji-data

常用漢字 2,136 字とかな 177 字について、**字形・書き順・筆圧つきアウトライン・部品階層・教育用読み・読みの段階** を持つ JSON データセット。
[diglabo](https://diglabo.com) の漢字ドリルのお手本と書き順アニメーションのために生成し、**CC BY-SA 4.0** で公開する。

- 字形と書き順は [KanjiVG](http://kanjivg.tagaini.net)（CC BY-SA 3.0）の既定字形
- 学年・画数・部首・読み・意味は [KANJIDIC2](https://www.edrdg.org/wiki/index.php/KANJIDIC_Project)（EDRDG, CC BY-SA 4.0）
- 教育用読み（小学校で習う読み）は文部科学省「[音訓の小・中・高等学校段階別割り振り表（平成29年3月）](https://www.mext.go.jp/a_menu/shotou/new-cs/1385768.htm)」

帰属の詳細と、印刷物に載せる1行は [ATTRIBUTION.md](./ATTRIBUTION.md)。

## 手本を表示・教材を作る・フォントを使う

教材向けの公開ライブラリをローカルで試せます。描画と文字データを二つのパッケージに分け、手本表示・筆順の段階表示・部品の色分けを提供します。**npmは公開前で、パッケージ名は仮称です。**

- **手本を表示**：[描画APIと最小の例](./packages/kanji/README.md)。ブラウザ／Node.js 22以上のESMで、外部通信やフォントを使わずSVGを生成します。
- **教材を作る**：[文字データの取得](./packages/data/README.md)。読み・学年・部首も型付きで扱えます。[素のJavaScript](./examples/browser/main.js)・[React](./examples/react/main.tsx)・[Node.js](./examples/node/lesson.mjs)の例があります。
- **フォントを使う**：[`dist/fonts/tehon.woff2`](./dist/fonts/tehon.woff2)（Web用）・[`tehon.otf`](./dist/fonts/tehon.otf)（PC用）。書体名は`DiglaboTehon`です。CC BY-SA 4.0と帰属表示の条件を確認してください。

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm build:examples
pnpm release:prepare
```

`artifacts/`に二つのnpm tarball、フォントZIP、JSON ZIP、検証結果、ハッシュ付きmanifestを作ります。別のプロジェクトへtarballをインストールして、次のように使えます。

```ts
import kyu from "@diglabo/kanji-data/chars/04f11";
import { renderCharacter } from "@diglabo/kanji";
const { svg, attribution } = renderCharacter(kyu);
```

`svg`とともに`attribution.text`を出典欄へ表示します。一文字のimportで全字形をWebへ送りませんが、データnpmのインストールには全2,313字が含まれます。必要なJSONだけをサイトへ同梱する例もあります。

詳しいローカル起動、互換表、検証・公開・データ更新の手順は[公開手順](./docs/public-library-release.md)。現時点のローカル配布物はCC BY-SA 4.0です。独自runtimeをMITにする方針は、対象範囲・権利の確認後に適用します。

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
- `dist/fonts/tehon.woff2` は全 2,313 字の筆圧アウトラインを塗った手本フォント（family `DiglaboTehon`・UPM 1000・y は上向き）。`dist/fonts/manifest.json` に版・sha256・字数を書く。
  バイト列は輪郭だけで決まる（作成・更新日時は固定、版番号は入れない）ので、版を上げても字形が同じなら sha256 は変わらない。
  1 グリフに画を重ねたまま入れている（重なりは除いていない）。1 画ずつ色を変える・画番号を出す用途には `strokes[].outline` を使う

## 筆圧つきアウトラインの決め方

太さは **画種ごとの設計図** `data/stroke-profiles.json` だけで決まり、**字ごとの上書きは持たない**。
基準の太さ `stemWidth` は 5.9（0.5.0 までの 6.4 の 92%）。画の多い字は `densityScale`（10 画までは 1、22 画以上で 0.71、その間は直線）でさらに細くする。画と画のすき間が潰れないようにするためで、画数だけで決まる。
`profilesVersion: 2` では、承認済みの輪郭を6画種（㇏・㇒・㇓・㇟・㇈・㇇）へ適用する。
しんにょうの `㇏a` は専用の `joinedSweep` とし、書き出しの太さを保って前画の終点を受ける（25字）。
設計図に `refinement` がある場合は `keys` / `endTaper` に代えて、画種共通の滑らかな幅曲線を使う。
右払いは左右にわずかな非対称性を持たせ、はねと折れからの払いは曲線の向きから終端区間を求める。
幅の指定点間は単調3次Hermite補間とし、細まり方が段々になるのを防ぐ。ほかの画種とかなは従来の設定を使う。
KanjiVG の `kvg:type`（添字込み 69 通り）から 完全一致 → 「／」の左側 → 添字を落とした基本形 25 種 の順で設計図を引き、型の無い画（かな）は `kana` を使う。

```jsonc
"㇚": { "width": 1.0, "start": "round", "end": "point", "keys": [[0, 1], [1, 1]], "endTaper": { "lastSegment": true, "ease": 0.6 } }
```

太さ `w(s) = stemWidth × width × keys(s/L) × taper(s)`。`keys` は弧長比率→倍率の折れ線、`endTaper` は終端で 1→0 に落とす領域
（`lastSegment` は最後の3次ベジエ1本＝KanjiVG は はね を最後のセグメントとして分けて描く）。`start`/`end` は `round`（とめ）・`flat`・`point`（はらい・はね）。
見た目が変な画種は設計図を直して全字に効かせる。幾何は `src/geometry/` にあり Node に依存しないので、ブラウザの書き順アニメーションでも同じコードで描ける。

`profilesVersion: 4` の `endExtension` は、漢字のはらい・はねを終端の接線方向へ短く延ばす。
延長は `min(中心線の全長 × fraction, densityScale 適用後の stemWidth × maxWidth)`。
払いは `maxWidth: 0.55`、はねは `0.4`、折れからの払いは `0.45`、いずれも `fraction: 0.08` とする。
既存の点列は動かさず、幅曲線を延長後の先端までつなぐ。`centerline` と `length` は元の KanjiVG の値を保ち、
描画用の `outline` とそれに基づく `bbox`・部品の範囲・手本フォントを更新する。
画種が指定されたかなも含め、かなには延長を適用しない。

比較前のチェックアウトを用意して次を実行すると、代表30字の前後比較HTMLと延長量のJSONを生成する。
HTMLは拡大・16mm・10mm・6mm表示、変更画の強調、元の中心線の重ね合わせを切り替えられる。

```bash
pnpm exec tsx scripts/stroke-length-preview.ts /path/to/baseline /path/to/output
```

## 生成環境（貢献者向け）

```bash
pnpm install
pnpm fetch        # input/ に KanjiVG r20250816・kanjidic2.xml・文科省 PDF を取得（pdftotext が要る）
pnpm mext         # PDF → data/mext-onkun-2017.json・data/mext-appendix-2017.json（検証つき）
pnpm build:data   # dist/ を生成（字データと手本フォント dist/fonts/）。警告は build/report.json
pnpm overview     # 目視用: build/overview-kanji.png（学年順の 1,026 字）・overview-joyo.png（中学で習う 1,110 字）・overview-kana.png・overview-types.html（画種別サンプル）・overview-radicals.html（部首の呼び名と部首の画）
pnpm test
```

`dist/fonts/tehon.otf` も同じビルドで出力する。WOFF2とOTFは同じアウトラインから生成される。

## 版

`package.json` の `version` がデータセットの版で、`dist/index.json` に写る。入力の版を上げたとき・設計図を変えたときに上げ、タグ `vX.Y.Z` で GitHub Release を切る。

## 既知の制限

- かなは `kvg:type` が無いので一律の設計図。第1リリースの紙には出さない
- 割り振り表の PDF で「𠮟」だけ文字層に無く、変換スクリプトで読みを戻している

## ライセンス

データセット全体は [CC BY-SA 4.0](./LICENSE)。KanjiVG（CC BY-SA 3.0）は同ライセンス §4(b) により後の版で改変物を配布できる。
生成コード（`src/`, `scripts/`）も同じライセンスで配る。
