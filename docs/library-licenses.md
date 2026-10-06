# 公開ライブラリのライセンス範囲

2026-10-07。独自runtimeをMITで提供する合意に基づき、次の範囲へMITを追加する。既に付与したCCライセンスを撤回するものではない。

| 対象 | ライセンス | 配布時の文書 |
|---|---|---|
| `packages/kanji/src/index.ts`・`validate.ts`・`types.ts`、そこから生成するJS・型、同パッケージのREADME | MIT | `packages/kanji/LICENSE` |
| データnpmに複製する`dist/types.d.ts` | MIT | `packages/data/LICENSE-MIT` |
| 文字データ・索引・manifest、フォント、既存生成コード・テスト素材・利用例など上記以外 | CC BY-SA 4.0 | ルートの`LICENSE`・`ATTRIBUTION.md` |

## 来歴の確認

MITの対象3ファイルは、このライブラリ実装で新規作成したもの（初出commit `1523dc3`、author `make1s`）。描画は渡された輪郭をSVGへ組み立て、部品の画番号・検索・入力検証を処理する。KanjiVGの字形・KANJIDIC2の辞書内容を埋め込まず、既存のgeometry・parserや外部runtimeの実装をコピー・importしていない。

`types.ts`は既存の`src/build/types.ts`が定めるデータ契約を読み取り専用として表した公開型である。既存型の履歴も当リポの`make1s`によるものと確認した。外部の文字データ本体は型宣言に含めない。テストの文字データや`src/fixtures/kanjivg-samples.ts`はMITの範囲に含めない。git authorだけで第三者の権利を判断する運用にはせず、今後の外部貢献は対象ライセンスと出典を個別に確認する。

## 利用時の扱い

- **描画コードを組み込む**：MITの著作権・許諾文を配布物へ含める。
- **SVGを教材へ載せる**：文字データ由来の出力であり、runtimeのMITで字形データの利用条件が置き換わることはない。`attribution.text`を出典欄へ表示し、配布物にデータの`LICENSE`・`ATTRIBUTION.md`を含める。画数の抜き出し・色分けなどの変更はその旨を記録し、改変データを再配布する際はCC BY-SA 4.0を適用する。
- **フォントを埋め込む・再配布する**：フォントZIPの`LICENSE`・`ATTRIBUTION.md`を添付し、利用画面・印刷物に出典を示す。フォント改変を配布する場合もCC BY-SA 4.0を維持し、変更を明示する。
- **文字データを配る**：必要なJSONだけを同梱する場合も、版・出典・ライセンスと変更の有無を示す。KANJIDIC2の更新確認は[公開手順](./public-library-release.md)に従う。

アプリ全体や、文字以外の独立した教材内容まで一律にCC BY-SAへ変更するという説明はしない。改変物か集合物かは具体的な使い方で判断する。

参照：[CCのソフトウェア向けFAQ](https://creativecommons.org/faq/#can-i-apply-a-creative-commons-license-to-software)、[CCのライセンスの仕組み](https://creativecommons.org/faq/#how-do-cc-licenses-operate)、[CC BY-SA 4.0の条件](https://creativecommons.org/licenses/by-sa/4.0/)、[KanjiVG](https://kanjivg.tagaini.net/)、[EDRDGの利用条件](https://www.edrdg.org/edrdg/licence.html)。
