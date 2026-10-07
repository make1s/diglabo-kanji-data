# DiglaboTehonの使い方

[READMEへ戻る](../README.md#フォントだけ使いたい) · [ブラウザで見本を見る](https://make1s.github.io/diglabo-kanji-data/)

![DiglaboTehonの漢字・ひらがな・カタカナの表示見本](./images/font-specimen.png)

## ダウンロード

**[フォント一式のZIP（データ版0.6.5）](https://github.com/make1s/diglabo-kanji-data/releases/download/renderer-v0.1.0-rc.1/diglabo-kanji-fonts-0.6.5.zip)**を使うと、二つのフォントと使い方・ライセンス・帰属情報がまとめて手に入ります。

| 用途 | 単体ダウンロード |
|---|---|
| PCの文書・スライド・DTP | [tehon.otf（OTF）](https://raw.githubusercontent.com/make1s/diglabo-kanji-data/v0.6.5/dist/fonts/tehon.otf) |
| Webサイト・Web教材 | [tehon.woff2（WOFF2）](https://raw.githubusercontent.com/make1s/diglabo-kanji-data/v0.6.5/dist/fonts/tehon.woff2) |

単体で取得する場合も、再配布時には[LICENSE](../LICENSE)と[ATTRIBUTION.md](../ATTRIBUTION.md)を含めてください。

## PCで使う

1. ZIPを解凍し、`fonts/tehon.otf`を開いてOSへインストールします。
2. 文書・スライドなどのアプリを開き、フォント欄で **DiglaboTehon** を選びます。表示されない場合はアプリを開き直してください。
3. プリントやスライドの出典欄に、下記の帰属情報を載せます。

## Webサイトで使う

ZIP内の`fonts/`をサイトの公開ファイルへコピーします。たとえば`/fonts/tehon.woff2`として配信する場合：

```css
@font-face {
  font-family: "DiglaboTehon";
  src: url("/fonts/tehon.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}

.tehon {
  font-family: "DiglaboTehon", serif;
}
```

```html
<p class="tehon">春夏秋冬 あいうえお アイウエオ</p>
<small>KanjiVG (CC BY-SA 3.0) / KANJIDIC2 © EDRDG (CC BY-SA 4.0)</small>
```

ライセンスと帰属情報もサイトの配布物に含めます。表示する文書・ページの文字コードはUTF-8を使ってください。

## 収録範囲と表示の注意

- 常用漢字2,136字とかな177字（ひらがな86字・カタカナ90字・長音符）。計2,313字です。
- 英数字・句読点などは収録していません。CSSでは上の`serif`など、併用するフォントも指定してください。
- 収録漢字は常用漢字表の字体です。「𠮟・塡・剝・頰」と、別の符号位置の「叱・填・剥・頬」は区別します。[文字データの詳細](./data-format.md)を参照してください。
- 一つの文字を一つのグリフとして収録しています。画ごとの色分けや筆順の段階表示には[描画ライブラリ](../README.md#アプリに組み込みたい)を使います。

## 利用条件と出典

フォントは**CC BY-SA 4.0**です。利用する画面・印刷物へ、次の出典を表示してください。

```text
KanjiVG (CC BY-SA 3.0) / KANJIDIC2 © EDRDG (CC BY-SA 4.0)
```

再配布時は`LICENSE`・`ATTRIBUTION.md`を同梱します。改変したフォントを配布する場合は変更を明示し、CC BY-SA 4.0を維持してください。[用途別の利用条件](./library-licenses.md)を確認してください。
