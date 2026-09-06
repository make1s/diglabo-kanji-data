#!/usr/bin/env bash
# 入力データを input/ に取得する。版は固定し、dist/index.json の sources と一致させる。
# EDRDG のライセンス §4（データを最新版に更新する手順を持つこと）は、このスクリプトを再実行することで満たす。
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p input

KVG_TAG=r20250816
KVG_URL="https://github.com/KanjiVG/kanjivg/releases/download/$KVG_TAG/kanjivg-20250816-all.zip"
if [ ! -d input/kvg/kanji ]; then
  curl -sSL -o input/kanjivg-all.zip "$KVG_URL"
  unzip -q -o input/kanjivg-all.zip -d input/kvg
fi

# KANJIDIC2 は常に最新が配られる（版は header の database_version で記録する）
[ -f input/kanjidic2.xml ] || curl -sSL http://www.edrdg.org/kanjidic/kanjidic2.xml.gz | gunzip > input/kanjidic2.xml

# 文部科学省「音訓の小・中・高等学校段階別割り振り表（平成29年3月）」
MEXT_URL="https://www.mext.go.jp/a_menu/shotou/new-cs/__icsFiles/afieldfile/2017/05/15/1385768.pdf"
[ -f input/mext-onkun-2017.pdf ] || curl -sSL -o input/mext-onkun-2017.pdf "$MEXT_URL"
[ -f input/mext-onkun-2017.tsv ] || pdftotext -tsv input/mext-onkun-2017.pdf input/mext-onkun-2017.tsv

ls -la input
