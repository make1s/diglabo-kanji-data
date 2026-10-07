import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import kyu from "@diglabo/kanji-data/chars/04f11";
import { listParts, renderCharacter } from "@diglabo/kanji";
function Lesson() {
  const [step, setStep] = useState(kyu.record.strokeCount);
  const [highlight, setHighlight] = useState(false);
  const wood = listParts(kyu).find((part) => part.element === "木");
  const { svg, attribution } = renderCharacter(kyu, { visibleStrokes: step, highlightPartIds: highlight && wood ? [wood.id] : [], color: "#172f38" });
  return <main><section className="intro"><p className="eyebrow">REACT EXAMPLE</p><h1>休を、ひと画ずつ。</h1><p>{kyu.record.eduReadings.on.join("・")} / {kyu.record.eduReadings.kun.join("・")}</p></section><section className="playground"><div className="canvas"><div dangerouslySetInnerHTML={{ __html: svg }} /></div><div className="controls"><label className="field">筆順：{step}画<input aria-label="筆順" type="range" min="0" max={kyu.record.strokeCount} value={step} onChange={(event) => setStep(Number(event.target.value))} /></label><label><input type="checkbox" checked={highlight} onChange={(event) => setHighlight(event.target.checked)} /> 木に色をつける</label></div></section><p className="attribution">{attribution.text}</p></main>;
}
const target = document.getElementById("root");
if (target) createRoot(target).render(<Lesson />);
