# 漢字ライブラリのローカル試用と公開手順

## 現在の状態

ローカルでパッケージ・デモ・ZIPを作れます。npm名は仮称で、npm公開・デモ公開・生成データの本番反映は行っていません。描画コードのMIT適用は公開前の確認事項として残し、現段階は既存のCC BY-SA 4.0を同梱しています。

| 描画 | データnpm | データ版 | schemaVersion |
|---|---|---|---|
| 0.1.0 | 0.6.5-pkg.1 | 0.6.5 | 1 |

## 試す

```sh
pnpm install --frozen-lockfile
pnpm build:packages
pnpm build:examples
pnpm typecheck
pnpm test
pnpm check:packages
pnpm exec playwright install chromium
pnpm test:browser
node examples/node/lesson.mjs
```

`pnpm check:packages --node24`ならNode.js 24でも全字形を読み戻します（npxでNode.js 24を取得します）。通常は実行中のNode.jsを使い、CIは22/24の両方で検証します。文科省の生成元TSVを使う既存テスト5件は、`input/`未取得時にスキップします。

デモはポートの空きを確認してから次で起動します。`examples/site/`は静的配信できます。

```sh
lsof -i :4317
python3 -m http.server 4317 --bind 127.0.0.1 --directory examples/site
```

`http://127.0.0.1:4317/`が素のJavaScript、`/react.html`がReactの利用例です。Nodeの例は`artifacts/node/lesson.html`へ教材を書き出します。部品識別子はデータ版・文字と一緒に保存してください。

## 配布候補を作る

```sh
pnpm release:prepare
```

`artifacts/`へ二つのnpm tarball、フォントZIP、JSON ZIP、SHA256SUMS、release-manifest.jsonを作ります。元の`dist/`は生成し直しません。manifestにはソースcommit・未コミット差分の有無と未確認事項を記録し、公開済みとは表記しません。

別のプロジェクトで試す場合は、二つのtarballの絶対パスを指定して`npm install /path/to/diglabo-kanji-0.1.0.tgz /path/to/diglabo-kanji-data-0.6.5-pkg.1.tgz`を実行します。READMEのimport例がそのまま使えます。

## 公開前に確認すること

- npm名・scope・初回公開権限を確認する。現行の仮称で公開できるとは仮定しない。
- 新規runtimeと公開型の来歴・権利を確認し、対象範囲にMITを適用する場合は対象LICENSE・package.json・READMEをまとめて変更する。既存の生成コード・fixture・文字データを一括で変更しない。
- SVG掲載、フォント埋め込み、データ再配布の案内を元資料の条件に照らして確認する。データとフォントはCC BY-SA 4.0を維持する。
- 公開するデモの配置と、READMEからのリンクを確認する。
- 変更履歴を更新し、クリーンなcommitから候補を作り直す。

## 公開時

検証したtarballを`next`タグで公開し、GitHub ReleaseへZIP・manifest・SHA256SUMSを添付します。この文書やCIは公開を自動実行しません。二つのnpm公開は原子的ではないため、片方が失敗した場合は失敗した側だけを再試行し、両方の読み戻し確認後にREADMEの推奨版を更新します。

既存のデータタグ`vX.Y.Z`は維持します。描画のタグは`renderer-vX.Y.Z`、梱包だけの変更は独立したタグで区別し、古いタグを付け直しません。初回登録後にtrusted publishing・provenanceを設定する場合は、実際の権限・設定状況を確認します。

## 月次のデータ更新確認

KanjiVG・KANJIDIC2・文科省資料の更新を確認し、入力の取得版と日付を記録します。更新する場合は既存の生成手順で警告・読みの補正・字形を検証し、データ版を上げてから公開用パッケージを作り直します。フォントと字形のmanifestも同じ版で照合します。差分と移行案内をCHANGELOG・互換表へ記録し、利用者が固定した版を更新する手順を示します。月次確認のスケジュールは本変更では登録していません。

問い合わせはGitHub Issuesへ集め、対応期限は約束しません。自社利用を中心に改善し、外部の教材作成例を確認して描画1.0を判断します。
