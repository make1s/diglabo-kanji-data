# READMEの見本画像

このディレクトリのPNGは、配布中の字形を示すための画像です。`hero.png`と`font-specimen.png`は実際の`dist/fonts/tehon.woff2`、`stroke-order.png`と`parts.png`は実際の文字データと公開描画APIから生成しています。

画像はCC BY-SA 4.0。元の字形はKanjiVG (CC BY-SA 3.0)、辞書情報はKANJIDIC2 © EDRDG (CC BY-SA 4.0)です。[帰属情報](../../ATTRIBUTION.md)と[LICENSE](../../LICENSE)を参照してください。色分け・筆順段階・見本用の配置を施しています。

生成元のデータ版とフォントのSHA-256は[manifest.json](./manifest.json)に記録します。再生成はリポジトリのルートで：

```sh
pnpm build:packages
pnpm exec playwright install chromium
pnpm exec tsx scripts/build-readme-images.ts
```

OSの日本語UIフォントとChromiumを使ってPNGへ描画します。見本の文字自体には配布フォント・配布データを使います。
