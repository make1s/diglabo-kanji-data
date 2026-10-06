# @diglabo/kanji

手本・筆順の段階表示・部品の色分けをSVGで生成します。ブラウザとNode.js 22以上で使えるESMです。実行時依存・外部通信・外部フォントはありません。

**現在はローカル試用用です。npm名と公開権限、ライセンスの確認が済むまでnpm公開済みとは扱いません。**

```ts
import kyu from "@diglabo/kanji-data/chars/04f11";
import { renderCharacter, listParts } from "@diglabo/kanji";

const wood = listParts(kyu).find((p) => p.element === "木");
const { svg, attribution } = renderCharacter(kyu, {
  size: 160,
  visibleStrokes: 3,
  highlightPartIds: wood ? [wood.id] : [],
});
```

`svg`を表示し、`attribution.text`を出典欄へプレーンテキストとして載せます。ライセンス・帰属の文書も配布物に同梱してください。SVG内のmetadataだけで画面・印刷物の帰属表示が完了するとは扱いません。

## API

- `renderCharacter(glyph, options?)` → `{ svg, attribution }`。
- `listParts(glyph)` → 部品の識別子・名前・親・画番号。画番号は1始まり。同名部品も別々に選択できます。
- `lookupCharacter(index, input)` → `found` / `unsupported` / `invalid-input`。NFC正規化し、異体字を自動置換しません。
- `filterCharacters(index, { grade?, kind? })` → 学年1〜6・文字種による索引の絞り込み。

描画オプションは`size`（128）、`visibleStrokes`（全画）、`color`（`currentColor`）、`highlightPartIds`（空）、`highlightColor`（`#d33`）、`title`（文字＋の手本）。色は`currentColor`または16進色3・4・6・8桁です。0画から全画までを順番に表示できます。画の途中までのアニメーションは含みません。

失敗は`KanjiError`で返し、`code`は`INVALID_DATA`、`UNSUPPORTED_SCHEMA`、`INVALID_OPTIONS`、`UNKNOWN_PART`です。部品識別子は同じデータ版・文字の中で安定します。保存する場合はデータ版・コードポイントも保存してください。

読み・部首・部品の階層は`glyph.record`から取得できます。`eduReadings`は教育用、`readings`は辞書の全読みです。かなの学年・部首はnullです。

型定義は自己完結しています。文字データを別途渡せば、このパッケージだけで描画できます。対応する公開データのschemaVersionは1です。

## ライセンス

現段階のローカル試用は同梱のCC BY-SA 4.0です。新規runtimeコードをMITにする設計方針はありますが、公開前に対象範囲・権利を確認してから適用します。文字データとフォントのCC BY-SA 4.0は独立して維持します。
