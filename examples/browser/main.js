import manifest from "@diglabo/kanji-data";
import { listParts, renderCharacter } from "@diglabo/kanji";

const byId = (id) => document.getElementById(id);
const select = byId("character");
const slider = byId("strokes");
const partList = byId("parts");
let glyph;
let rendered;
let request = 0;
function draw() {
  if (!glyph) return;
  rendered = renderCharacter(glyph, {
    size: 320,
    visibleStrokes: Number(slider.value),
    color: "#172f38",
    highlightColor: "#d66339",
    highlightPartIds: [...partList.querySelectorAll("input:checked")].map((input) => input.value),
  });
  byId("drawing").innerHTML = rendered.svg;
  byId("stage").textContent = `${slider.value} / ${glyph.record.strokeCount} 画`;
  byId("attribution").textContent = rendered.attribution.text;
}
async function load() {
  const current = ++request;
  byId("message").textContent = "読み込み中…";
  try {
    const response = await fetch(`./data/${select.value}.json`);
    if (!response.ok) throw new Error("文字データを読み込めませんでした");
    const record = await response.json();
    if (current !== request) return;
    glyph = { record, manifest };
    slider.max = record.strokeCount;
    slider.value = record.strokeCount;
    partList.replaceChildren();
    for (const part of listParts(glyph).slice(1)) {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "checkbox";
      input.value = part.id;
      label.append(input, `${part.element ?? "名前のない部品"}（${part.strokes.join("・")}画）`);
      partList.append(label);
    }
    if (!partList.childElementCount) partList.textContent = "この文字に子部品はありません。";
    byId("reading").textContent = [...record.eduReadings.on, ...record.eduReadings.kun].join(" / ") || "かな";
    byId("grade").textContent = record.grade === null ? (record.kind === "kanji" ? "常用漢字" : "かな") : `小学校${record.grade}年`;
    byId("message").textContent = "";
    draw();
  } catch (error) {
    if (current === request) byId("message").textContent = error instanceof Error ? error.message : "表示できませんでした";
  }
}
select.addEventListener("change", load);
slider.addEventListener("input", draw);
partList.addEventListener("change", draw);
byId("complete").addEventListener("click", () => { slider.value = slider.max; draw(); });
byId("download").addEventListener("click", () => {
  if (!rendered) return;
  const url = URL.createObjectURL(new Blob([rendered.svg], { type: "image/svg+xml" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${glyph.record.codepoint}.svg`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});
load();
