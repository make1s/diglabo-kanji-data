# 教材開発者向け漢字ライブラリの実装仕様

2026-10-07。壁打ちで合意した初版の仕様。段階1〜3は実装してローカルで検証済み。新規runtime・公開型へMITを適用済み。npm公開・デモ公開は確認事項を残している。
用語は [CONTEXT.md](../../../CONTEXT.md)、判断の根拠は [ADR 0001](../../adr/0001-environment-independent-svg.md)〜[0004](../../adr/0004-separate-code-and-data-licenses.md)。

## 1. 目的と範囲

教材開発者が、文字データの生成環境やdiglaboのAPIを用意せずに、手本・筆順の段階表示・部品の色分けを教材へ組み込めるようにする。最初の成功条件は「第三者がREADMEと利用例だけで、読みと手本を並べた教材を一つ作れること」。外部の採用事例と改善フィードバックを得るため、diglabo自身で使う機能を中心に保守する。

初版の範囲は常用漢字2,136字とかな177字の全2,313字。読み・配当学年・部首・部品構造も型付きで取得できる。かなの読み・部首・学年が空またはnullとなる既存の意味を維持する。学年nullを一律に「中学生向け」と読み替えない。

対象外は、画の途中までを描く筆順アニメーション、書き取り判定、問題生成、PDF/PNG変換エンジン、React専用コンポーネント、提供者が運用するデータ配信API、任意の漢字・異体字の追加、低水準の輪郭生成コードの安定API化。フォントとSVGの字形を同時に調整する作業も、この実装では行わない。

## 2. 現状と維持する契約

基準はデータv0.6.5。文字別JSONは合計約24MB、索引は約298KB、WOFF2は約1.16MB、OTFは約2.60MB。これらは実ファイルの未圧縮サイズであり、通信量やnpmアーカイブのサイズとは区別する。

- 生成プロジェクトのルートは引き続きprivateとし、既存の生成・テスト用コマンドを維持する。
- `dist/chars/*.json`、`dist/index.json`、`dist/fonts/*` の配置・形式・既存の版の意味を維持する。npm用の加工は別の出力先に行う。
- データとフォントは現在と同じ生成結果から梱包する。公開用パッケージを作るために字形・読み・フォントを再生成しない。
- 既存のモノレポの固定版取得・DB取り込み・PDF生成をこの実装の移行対象に含めない。

## 3. 配布単位

以下のnpm名を公開名とする。2026-10-07に無料組織`diglabo`を作成し、`dighacks`のOwner権限を確認した。初回公開の本人認証は別途必要。

| 提供物 | 公開名と初版 | 含めるもの |
|---|---|---|
| 描画 | `@diglabo/kanji` 0.1.0 | ESMのJavaScript、独立した型定義、README、対象コードのライセンス |
| 文字データ | `@diglabo/kanji-data` | 文字別ESM、索引、データmanifest、独立した型定義、帰属・ライセンス |
| フォント | データ版に対応するGitHub Release添付ZIP | WOFF2、OTF、フォントmanifest、帰属・ライセンス、CSS利用例 |
| JSONデータ | 同Release添付ZIP | 既存の文字別JSON・索引、データmanifest、帰属・ライセンス |

既存の独立リポ内に公開用の二つのパッケージを置き、pnpm workspaceで開発する。描画用は`packages/kanji`、データ用は`packages/data`を想定する。生成用ルートのバージョンは引き続き既存データの版とする。

両npmパッケージはESMと型定義を配り、公開する入口だけを`exports`で明示する。描画の実行時依存は持たず、React・Node専用機能・データパッケージを実行時依存やpeer dependencyにしない。データ側も描画ライブラリのインストールを必須にしない。

### データの読み込み量

データパッケージのルートはmanifestだけを公開する。索引は`/index`、各文字は`/chars/{codepoint}`から明示的に読む。コードポイントは既存JSONと同じ小文字16進・最低5桁とする。全文字を自動でimportする入口は初版に作らない。

文字別ESMは既存JSONから生成し、manifestを参照して一文字分をdefault exportする。JSON import属性や実行時のファイル読み込みを利用者に要求しない。ブラウザでの動的読み込みは、利用者が配信するJSONを読む例で説明し、可変のnpm importパスがすべてのbundlerで解決するとは約束しない。

一文字のimportで全字形をWebへ送らないことを検証する。一方、npmでデータパッケージをインストールすると全収録文字が手元に入る。インストール容量も減らしたい利用者には、JSONの必要ファイルを同梱する方法を説明する。

`exports`と公開対象ファイルは[Nodeの公式仕様](https://nodejs.org/api/packages.html#subpath-exports)と[npmのfiles設定](https://docs.npmjs.com/cli/v11/configuring-npm/package-json/#files)に従う。

## 4. 文字データと版の契約

描画に渡す一文字分を`Glyph`とし、`record`と`manifest`を持たせる。`record`は既存の`CharRecord`相当で、字形・読み・部品などを保持する。`manifest`には次を含める。

- `schemaVersion`：公開する型と意味の互換性を表す整数。初版は1。
- `datasetVersion`：基にした既存データの版。
- `profilesVersion`：字形生成に使用した画種設定の版。
- `license`・`sources`：データのライセンス、元資料の名前・URL・ライセンス・取得版または日付。

公開する索引は`CharacterIndex`とし、同じ`manifest`と、既存索引と同じ文字の要約配列`chars`を持たせる。要約には`char`・`codepoint`・`kind`・`grade`・`strokeCount`を含める。既存の索引JSONは書き換えず、npm梱包時にこの形へ包む。JSONを利用者が読む例でも、レコードとmanifest、索引とmanifestをそれぞれ組にする。

二つのnpmパッケージには、同じ契約定義から生成した自己完結する型定義を配る。型の参照のためだけに一方からもう一方への依存を追加しない。既存の生成用型との一致はビルド時に検証する。公開型は読み取り専用として扱う。

データnpmの版はデータ版と梱包版を区別する。最初に既存v0.6.5を梱包する場合は`0.6.5-pkg.1`のような版を使い、manifestの`datasetVersion`は`0.6.5`のままにする。同じ文字データで梱包だけ直した場合は梱包版を上げる。利用者向けに描画版・データnpm版・datasetVersion・schemaVersionの対応表を載せる。

描画0.x中も、同じschemaVersionのデータで公開型や意味を黙って破壊しない。描画APIの破壊的変更はminor版で変更点と移行例を出す。schemaVersionを変える場合は互換表を更新し、未対応のschemaVersionを描画時に明確に拒否する。

## 5. 公開API

以下の関数名と既定値を実装の初期契約とする。

| API | 契約 |
|---|---|
| `renderCharacter(glyph, options?)` | 手本SVGと帰属情報を返す同期関数 |
| `listParts(glyph)` | 部品識別子・親識別子・名前・元の名前・対象画番号の一覧を返す |
| `lookupCharacter(index, input)` | 完全一致の文字を索引から探し、収録・未対応・入力不正を区別して返す |
| `filterCharacters(index, filter)` | 配当学年1〜6・文字種で索引を絞り、元の順番で返す |

公開型の主要部分は次の形とする。`CharacterRecord`は既存の`CharRecord`のフィールドと意味を維持し、配列を含め読み取り専用にする。`DatasetManifest`は前節の契約、`CharacterSummary`は前節の要約である。

```ts
interface Glyph {
  readonly record: CharacterRecord;
  readonly manifest: DatasetManifest;
}
interface CharacterIndex {
  readonly manifest: DatasetManifest;
  readonly chars: readonly CharacterSummary[];
}
interface PartInfo {
  readonly id: string;
  readonly parentId: string | null;
  readonly element: string | null;
  readonly original: string | null;
  readonly strokes: readonly number[];
}
type LookupResult =
  | { readonly status: "found"; readonly entry: CharacterSummary }
  | { readonly status: "unsupported"; readonly input: string }
  | { readonly status: "invalid-input"; readonly input: string };
```

`listParts`の戻り値は`readonly PartInfo[]`で階層の深さ優先順、`lookupCharacter`は`LookupResult`、`filterCharacters`は`readonly CharacterSummary[]`とする。部品の対象画番号は既存と同じ1始まり。`filterCharacters`の`grade`は1〜6の整数、`kind`は既存の三つの文字種とし、省略した条件では絞り込まない。不正な条件は`INVALID_OPTIONS`で拒否する。

読み・部首などは`glyph.record`から型付きで取得する。教育用の読みと辞書の全読みは別のフィールドのままとし、送り仮名の区切り`.`を黙って削除しない。読み検索や学習単元の推定は初版に加えない。

### 描画オプション

| 項目 | 既定値と意味 |
|---|---|
| `size` | 128。SVGの幅と高さ。正の有限数を受ける |
| `visibleStrokes` | 全画。0〜画数の整数。筆順の先頭から指定画数を表示する |
| `color` | `currentColor`。通常の画の色 |
| `highlightPartIds` | 空配列。指定した部品に含まれる画の和集合を強調する |
| `highlightColor` | `#d33`。部品の強調色 |
| `title` | 「文字＋の手本」。SVGの読み上げ用の名前 |

初版の色指定は`currentColor`と16進色（3・4・6・8桁）に限定する。任意のCSS、HTML、SVG属性を挿入する口は作らない。表示されない画は描かず、残りの画の重なり順は筆順を保つ。部品の強調も表示中の画にだけ効く。画の途中までを描く時間指定や、輪郭の作り直しは行わない。

戻り値は`{ svg, attribution }`。`attribution`には表示用のプレーンテキストと、元資料の名前・URL・ライセンスの一覧を含める。SVGにも出典をmetadataとして入れるが、これだけで画面や印刷物の表示条件を満たすと説明しない。利用例では帰属情報を実際に画面へ表示し、再配布時の文書同梱も案内する。

出力は外部フォントや通信を必要とせず、入力の`outline`をそのまま使う。同じ入力・オプションなら同じSVG文字列を返す。文字やタイトルをXMLとしてエスケープし、データやオプションからイベント属性・script・外部参照を生成しない。SVGは画像としての名前を持ち、同じページに複数置いても識別子が衝突しない形にする。

### 部品識別子

部品は、文字のコードポイントと部品階層内の位置から識別する。「林」の左右の「木」は別識別子になる。名前の無い部品も一覧に含める。親部品と子部品を同時指定した場合は対象画の和集合を使う。

識別子の安定性は同じdatasetVersion・同じ文字の中で保証する。データ更新で階層が変わる可能性があるため、別の版へ識別子だけを持ち越せるとは約束しない。保存する利用者にはdatasetVersion・codepoint・部品識別子を一緒に保持する例を示す。初版では色分けの優先順位を要する複数パレットを導入しない。

### 未対応・エラー

`lookupCharacter`は入力をNFCに正規化し、Unicodeコードポイント単位で一文字かを確認する。空文字・複数文字は`invalid-input`、収録外は`unsupported`、収録字は`found`と対応する索引項目を返す。異体字の自動置換や、先頭の一文字だけを採用する動作は行わない。補助漢字「𠮟」も一文字として扱う。

描画などに渡すデータやオプションが不正な場合は、公開する`KanjiError`に機械判定用の`code`を持たせる。初版のcodeは`INVALID_DATA`、`UNSUPPORTED_SCHEMA`、`INVALID_OPTIONS`、`UNKNOWN_PART`。SVGの空文字で失敗を隠さず、入力を変更せず、失敗時に部分的な出力を返さない。

データを受けるすべてのAPIでmanifestのschemaVersionを確認し、索引でも未対応schemaを拒否する。データの必須項目、有限な座標、画番号の整合、部品の対象画番号を検証し、不正なレコードを不明な実行時例外に任せない。

## 6. 最小の利用例

以下はローカルで生成したtarballをインストールして実行できる例。npm公開前のため、tarballから導入する。

```ts
import kyu from "@diglabo/kanji-data/chars/04f11";
import { listParts, renderCharacter } from "@diglabo/kanji";

const wood = listParts(kyu).find((part) => part.element === "木");
const result = renderCharacter(kyu, {
  size: 160,
  visibleStrokes: kyu.record.strokeCount,
  highlightPartIds: wood ? [wood.id] : [],
});

// result.svgを表示し、result.attribution.textを出典欄に載せる。
// 読みはkyu.record.eduReadingsから取得できる。
```

READMEの入口は「手本を表示」「教材を作る」「フォントを使う」の三つとし、生成環境の構築は貢献者向けの節へ移す。実装時に次の動く利用例を揃える。

1. 素のJavaScript：文字選択、筆順スライダー、部品の色分け、帰属表示。自分のサイトからJSONを読む例も含める。
2. React：同じAPIを使う小さな教材。React専用パッケージは作らない。
3. Node.js：読みと手本のあるSVGまたはHTML教材をファイルに保存する。外部通信なしで実行できる。
4. フォント：`@font-face`、文字の見本、対応文字、未収録字のfallback、ライセンスと帰属の案内。

公開デモはライブラリの利用例を静的ビルドしたものとし、READMEから体験・ソース・ダウンロードへ辿れるようにする。GitHub Pages等の公開先と権限は公開時に確認する。ブラウザで動くことと、見本で試せることを別々の手実装で証明しない。

## 7. 検証と受け入れ条件

生成内部の関数を細かく固定するテストより、梱包された二つのパッケージを外部の利用者として読み込む境界を中心に検証する。既存の字形・フォントのテストは維持する。

- 二つの`npm pack`の成果物を、開発リポへのリンクがない一時プロジェクトへインストールする。Node.js 22と24のESM実行、TypeScriptのNodeNextとbundler解決、ブラウザ向けのビルドを検証する。
- 描画だけのインストールに文字データ・React・フォント生成用のnative依存が入らない。インストール後にビルドや外部取得を要求しない。
- 「休」一文字のWeb用ビルドに未使用の文字・索引・フォントが混入しない。圧縮後JSのサイズと収録文字を計測して記録し、約24MBの全量混入を検出する。
- 全2,313字について、配布データと既存JSONのレコードが一致し、索引・manifest・フォントの対応字数と版を検証できる。公開用加工だけで既存の`dist/`に差分を生まない。
- 「休」の部品色分け、「林」「森」の同名部品の区別、入れ子の部品の和集合、0画・途中・全画、かな、補助漢字、未対応文字、入力不正を公開APIで確認する。
- 未対応schema、別文字の部品識別子、不正なサイズ・色・画数を明確に拒否する。タイトルやデータにXML特殊文字があっても属性や要素を注入しない。
- SVGを画像として描画し、代表字「永・休・林・森・心・水・道・あ・ア・𠮟」で手本・段階表示・色分け・読み上げ名・帰属欄を目視する。描画を文字列の完全一致テストだけで保証しない。
- 二つのnpm tarballとZIPに、README・型・対象ライセンス・帰属情報が入り、生成入力・開発専用素材・無関係なファイルが混入しない。
- READMEからインストール・教材作成・フォント利用へ進める。クリーンな環境で三つのコード利用例を実行できることを自動検証し、第三者による教材作成を試用段階の成功条件とする。

代表字と全数確認を分け、通常のCIでは公開API・梱包・型・全数データ整合を確認する。ブラウザ表示は利用例で確認する。ローカルでは141テスト、ブラウザ4件、Node.js 22/24での全2,313字のtarball照合、二つのパッケージの単独導入と型解決、代表10字・PC/スマートフォン表示の目視を実施済み。一文字のWebビルドは13,507 bytes、gzip 5,881 bytesで、他の字形・索引・フォントの混入がないことを確認した。検証手順と公開前の確認事項は[公開手順](../../public-library-release.md)を参照。

## 8. ライセンスと公開条件

権利を確認できた独自のruntimeコードへMITを適用する。コードの来歴と対象ファイルを記録し、KanjiVGを転記したfixtureやデータ由来の例を一括でMITへ変更しない。生成コード全体のライセンスを変更することは初版の必須条件にしない。

文字データと手本フォントは現在のCC BY-SA 4.0を維持し、元資料の条件と帰属を添付する。出典情報の取得APIと表示例を用意するが、利用者のアプリ全体や教材全体に適用される条件を一律に断定しない。SVG掲載・フォント埋め込み・データ再配布の利用案内は、それぞれの条件を確認して書き分ける。

KANJIDIC2の提供元は定期更新の手順を求めている。月次で上流の更新を確認し、差分・警告・教育用読みの補正を検証して新しいデータを出す手順を公開する。版固定は再現性のために使い、古いデータを無期限に使ってよいという説明にはしない。更新確認の自動化は提案段階で、この仕様作成からスケジュールを登録しない。[EDRDG公式条件](https://www.edrdg.org/edrdg/licence.html)

## 9. リリースと保守

1. 権利範囲・パッケージ名・scope・初回公開権限を確認する。
2. 型契約、描画、梱包、利用例を実装し、受け入れ条件を満たす。
3. tarball二つ、フォントZIP、JSON ZIP、互換表、変更履歴、ファイルごとのSHA-256を一つのリリースmanifestにまとめる。同じcommitから作り、実データの版を記録する。
4. 既存のデータタグ`vX.Y.Z`を維持し、描画には`renderer-vX.Y.Z`を使う。描画だけの更新時も使用データ版を記録し、過去のデータタグを付け直さない。梱包だけの更新は別の公開タグで区別する。
5. 検証済みtarballをnpmの試用用dist-tagで公開する。二つの公開は原子的ではないため、片方の失敗時は失敗した側だけを再試行し、互換表が揃うまでREADMEの推奨版を切り替えない。
6. GitHub ReleaseへZIPとmanifestを添付し、実際に公開されたnpm版とダウンロードをクリーンな環境から確認する。デモ・READMEのリンクとGitHubの字数説明を更新する。

公開はソースのビルド元が確認できる手順にし、初回登録後に利用可能なnpmのtrusted publishingとprovenanceを設定する。既存設定や認証は未確認であり、設定済みとは扱わない。[npmの公式説明](https://docs.npmjs.com/trusted-publishers/)

問い合わせはGitHub Issuesに集め、対応期限は約束しない。自社利用で生じた不具合を中心に改善し、試用段階の外部利用例から破壊的なAPI修正が落ち着いた時点で1.0を判断する。

## 10. 実装の区切り

| 段階 | 完成条件 |
|---|---|
| 1. 公開型と梱包 | 二つのtarballから一文字を読み、元JSONと一致。既存の生成物は同じ |
| 2. 描画API | 手本・段階表示・部品選択・出典取得・エラーを公開APIから検証 |
| 3. 利用例と配布物 | 素のJavaScript・React・Nodeの例、フォント見本、README、ZIPが揃う |
| 4. 試用公開 | 権利と公開権限の確認、互換表、公開後の読み戻し確認が完了 |

2026-10-07、段階1〜4を完了。二つのnpmを`next`タグで試用公開し、公開レジストリから全2,313字を読み戻して元JSON・候補tarballのintegrityと照合した。公開Releaseの四つの配布物も再ダウンロードし、SHA-256・ZIPの破損・ライセンス同梱・フォントの一致を確認。デモも公開済み。MITの対象と来歴は[ライセンス範囲](../../library-licenses.md)、現在の版と公開手順は[公開手順](../../public-library-release.md)を参照。trusted publishing・provenanceは未設定で、次の版更新時に設定・検証する。
