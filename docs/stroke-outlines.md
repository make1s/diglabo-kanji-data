# 筆圧つきアウトラインの設計

[READMEへ戻る](../README.md) · [開発・生成手順](./development.md)

以下のパスはリポジトリのルートからの相対パスです。

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
