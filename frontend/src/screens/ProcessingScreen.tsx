import { useEffect, useState } from "react";
import { Check, Doc, Spinner } from "../icons";

// Cosmetic stepper shown while the backend extracts/cleans/segments. The real
// work happens in one request; these steps make the wait legible and trust-
// building (per the design's processing screen).
const STEPS = [
  "Extracting text",
  "Removing headers, footers & page numbers",
  "Detecting reading order & columns",
  "Segmenting into paragraphs",
  "Normalizing numbers & abbreviations",
  "Synthesizing first paragraphs",
];

export function ProcessingScreen({ fileName, done }: { fileName: string; done: boolean }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 520);
    return () => clearInterval(t);
  }, []);

  // When the backend finishes, jump the stepper to complete.
  const activeStep = done ? STEPS.length : step;

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 454, animation: "dl-fadeup .4s ease" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 26 }}>
          <div style={{ width: 40, height: 50, borderRadius: 6, background: "linear-gradient(160deg,#f3f3fb,#e9e9f6)", border: "1px solid #e4e4ee", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Doc />
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#33333b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 360 }}>{fileName}</div>
        </div>
        <h2 style={{ fontSize: 23, fontWeight: 600, letterSpacing: "-.02em", color: "#16161c", margin: "0 0 22px" }}>Got it — cleaning this up</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {STEPS.map((label, i) => {
            const isDone = i < activeStep;
            const isActive = i === activeStep;
            return (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 13, padding: "11px 4px", opacity: i > activeStep ? 0.4 : 1, transition: "opacity .35s" }}>
                <span style={{ width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isDone ? <Check size={20} color="#27a06a" /> : isActive ? <Spinner /> : <span style={{ width: 14, height: 14, border: "2px solid #dcdce3", borderRadius: "50%" }} />}
                </span>
                <span style={{ flex: 1, fontSize: 14.5, fontWeight: 500, color: "#33333b" }}>{label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 24, fontSize: 12.5, color: "#a0a0ab" }}>
          Synthesizing audio just ahead of playback — first words in seconds.
        </div>
      </div>
    </div>
  );
}
