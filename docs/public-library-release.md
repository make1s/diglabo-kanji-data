# 漢字ライブラリのローカル試用と公開手順

## 現在の状態

描画[`@diglabo/kanji@0.1.0`](https://www.npmjs.com/package/@diglabo/kanji)と文字データ[`@diglabo/kanji-data@0.6.5-pkg.1`](https://www.npmjs.com/package/@diglabo/kanji-data)を`next`タグで試用公開しています。新規の描画runtimeと公開型はMIT、文字データとフォントはCC BY-SA 4.0です。[対象範囲・来歴・用途別の案内](./library-licenses.md)を確認してください。[デモ](https://make1s.github.io/diglabo-kanji-data/)と[GitHub Release](https://github.com/make1s/diglabo-kanji-data/releases/tag/renderer-v0.1.0-rc.1)も公開済みです。

2026-10-07、無料npm組織`diglabo`（Owner: `dighacks`）から本人認証を経て初回公開しました。別ディレクトリへ公開レジストリから導入し、候補tarballと同じintegrity・全2,313字の元JSONとの一致・SVG描画を確認しました。既存の字形・フォントと本番データは本公開で変更していません。trusted publishing・provenanceは未設定です。

```sh
npm install @diglabo/kanji@next @diglabo/kanji-data@next
```

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

- npmの2段階認証を有効にし、初回公開時の本人認証を完了する。scope・Owner権限は確認済み。
- MITの対象・許諾文、データ側の`LICENSE-MIT`、用途別の案内を配布候補で照合する。既存の生成コード・fixture・文字データを一括で変更しない。
- 公開するデモの配置と、READMEからのリンクを確認する。
- 変更履歴を更新し、クリーンなcommitから候補を作り直す。

## 公開時

### npmのアカウントとscope

公開するアカウントの手元ターミナルで`npm login --auth-type=web --registry=https://registry.npmjs.org`を実行し、ブラウザでログインします。続いて`npm whoami --registry=https://registry.npmjs.org`でアカウントを確認し、npmの組織設定で`@diglabo`の公開権限を確認します。別のscopeを使う場合はpackage.jsonだけでなく、README・利用例・検証スクリプトのimport名も揃え、候補を作り直します。

クリーンなソースから再生成して検証したtarballを、そのまま次で公開します。

```sh
npm publish ./artifacts/diglabo-kanji-0.1.0.tgz --access public --tag next --registry=https://registry.npmjs.org
npm publish ./artifacts/diglabo-kanji-data-0.6.5-pkg.1.tgz --access public --tag next --registry=https://registry.npmjs.org
```

検証したtarballを`next`タグで公開し、GitHub ReleaseへZIP・manifest・SHA256SUMSを添付します。この文書やCIは公開を自動実行しません。二つのnpm公開は原子的ではないため、片方が失敗した場合は失敗した側だけを再試行し、両方の読み戻し確認後にREADMEの推奨版を更新します。

既存のデータタグ`vX.Y.Z`は維持します。描画のタグは`renderer-vX.Y.Z`、梱包だけの変更は独立したタグで区別し、古いタグを付け直しません。初回登録後にtrusted publishing・provenanceを設定する場合は、実際の権限・設定状況を確認します。

### デモとGitHub Release

`.github/workflows/demo.yml`はmainだけを手動公開するGitHub Pages用workflowです。PRの統合後、リポジトリのSettings → Pages → SourceでGitHub Actionsを選び、Actionsの「Publish library demo」をmainで実行します。型・テスト・梱包・ブラウザ検証が通った静的デモだけを配信します。[GitHubの公式手順](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)に従います。

公開URLは[https://make1s.github.io/diglabo-kanji-data/](https://make1s.github.io/diglabo-kanji-data/)です。2026-10-07、workflow run `37549849026`で初回配信。公開URLで手本・筆順操作・同名部品の区別と色分け・SVG保存・フォント・React例・PC/スマートフォン表示を確認しました。

初回のGitHub Releaseはprereleaseとし、二つのtarball・二つのZIP・release-manifest.json・SHA256SUMSを添付します。公開名が未確定の候補はdraftに置きます。npm公開が済むまではnpmのインストールコマンドを公開済みとして案内しません。公開後は別ディレクトリからtarball・ZIPを取り直し、ハッシュ・全字形・型解決を確認します。npmは[公開時のスキャン](https://github.blog/changelog/2026-07-28-npm-publish-time-malware-scanning-and-dual-use-metadata/)により、publish成功直後でも読み戻しが404になる場合があります。同じ版を再公開せず、インストール可能になるまで待って確認します。

## 月次のデータ更新確認

KanjiVG・KANJIDIC2・文科省資料の更新を確認し、入力の取得版と日付を記録します。更新する場合は既存の生成手順で警告・読みの補正・字形を検証し、データ版を上げてから公開用パッケージを作り直します。フォントと字形のmanifestも同じ版で照合します。差分と移行案内をCHANGELOG・互換表へ記録し、利用者が固定した版を更新する手順を示します。月次確認のスケジュールは本変更では登録していません。

問い合わせはGitHub Issuesへ集め、対応期限は約束しません。自社利用を中心に改善し、外部の教材作成例を確認して描画1.0を判断します。
