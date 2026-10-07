# @diglabo/kanji-data

常用漢字2,136字＋かな177字の文字別データです。初版は`next`タグで提供する試用版です。

```sh
npm install @diglabo/kanji-data@next
```

```ts
import kyu from "@diglabo/kanji-data/chars/04f11";
import index from "@diglabo/kanji-data/index";
import manifest from "@diglabo/kanji-data";

console.log(kyu.record.eduReadings, manifest.datasetVersion);
console.log(index.chars.filter((c) => c.grade === 2));
```

一文字のモジュールは`{ record, manifest }`です。筆順、画の輪郭、部品、部首、読み、教育用読み、読みの段階、配当学年を型付きで取得できます。コードポイントは小文字16進・最低5桁です（「休」は`04f11`、「𠮟」は`20b9f`）。

ルートはmanifestだけ、索引は`/index`から明示的に読みます。全字形を自動で読み込む入口はありません。一文字のimportでWebへ全データを送りませんが、npmでのインストールには全2,313字が含まれます。必要なJSONだけをサイトに置く方法も利用例で説明します。

データ版とnpm梱包版を区別します。例：npm `0.6.5-pkg.1`はデータ`0.6.5`、schemaVersion `1`。描画ライブラリを必須の依存にしません。

データはCC BY-SA 4.0。複製した公開型`dist/types.d.ts`はMITで、著作権・許諾文を`LICENSE-MIT`に同梱しています。元資料の帰属とライセンスは`ATTRIBUTION.md`と`LICENSE`を参照してください。再配布時にも同梱し、利用する画面・印刷物で出典を示してください。データの定期更新手順はリポジトリの公開手順を参照してください。
