# 開発・データ生成

[READMEへ戻る](../README.md) · [文字データの形式](./data-format.md) · [アウトラインの設計](./stroke-outlines.md)

Node.js 22以上とpnpmを使います。以下のコマンドはリポジトリのルートで実行します。

## データとフォントを生成する

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

- かなは `kvg:type` が無いので一律の設計図を使う
- 割り振り表の PDF で「𠮟」だけ文字層に無く、変換スクリプトで読みを戻している


## ライブラリとREADMEの画像を生成する

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm build:examples
pnpm exec playwright install chromium
pnpm exec tsx scripts/build-readme-images.ts
```

READMEの画像は実際の配布フォントと公開描画APIから作ります。生成元の版とフォントのSHA-256を`docs/images/manifest.json`へ記録します。

型・全字形の梱包検証・ブラウザ検証と公開手順は[公開手順](./public-library-release.md)を参照してください。
