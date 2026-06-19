import { useEffect, useMemo, useRef } from "react";
import { Player } from "../components/Player";
import { Check, Chevron, Spinner, Warn } from "../icons";
import type { SegStatus } from "../usePlayer";
import type { DocumentOut, Voice } from "../types";

interface Props {
  doc: DocumentOut;
  voice: Voice | null;
  para: number;
  playing: boolean;
  speed: number;
  genFrontier: number; // highest cached idx (for scrubber gen %)
  statusOf: (idx: number) => SegStatus;
  toast: string;
  onBack: () => void;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCycleSpeed: () => void;
  onJump: (idx: number) => void;
  onRetry: (idx: number) => void;
  onOpenVoice: () => void;
}

export function ReaderScreen(props: Props) {
  const { doc, para, statusOf } = props;
  const scroller = useRef<HTMLDivElement>(null);

  // auto-scroll: keep the active paragraph centred, but only if it's drifted
  // out of comfortable view (never jerk the user mid-read).
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const el = sc.querySelector<HTMLElement>(`[data-pidx="${para}"]`);
    if (!el) return;
    const top = el.offsetTop - sc.clientHeight / 2 + el.clientHeight / 2;
    sc.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [para]);

  const total = doc.segments.length;
  const playPct = total ? Math.round((para / total) * 100) : 0;
  const genFrontier = props.genFrontier;
  const genPct = total ? Math.round(((genFrontier + 1) / total) * 100) : 0;
  const section = doc.segments[para]?.section ?? null;

  // table of contents from headings
  const toc = useMemo(
    () => doc.segments.filter((s) => s.type === "heading"),
    [doc.segments],
  );

  function onSeek(fraction: number) {
    props.onJump(Math.min(total - 1, Math.round(fraction * (total - 1))));
  }

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column" }}>
      {/* header */}
      <div style={header}>
        <button onClick={props.onBack} style={backBtn}><Chevron dir="left" size={18} color="#6e6e78" /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 600, color: "#26262e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.document.title}</div>
          <div style={{ fontSize: 12, color: "#a0a0ab", marginTop: 1 }}>{doc.document.subtitle}</div>
        </div>
        <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "#9a9aa5" }}><Check size={13} />Progress saved</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
        {/* TOC sidebar */}
        {toc.length > 1 && (
          <div style={tocPanel}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#a0a0ab", letterSpacing: ".09em", padding: "0 14px 10px" }}>CONTENTS</div>
            {toc.map((h) => (
              <button key={h.idx} onClick={() => props.onJump(h.idx)} style={{ ...tocItem, color: h.idx === para ? "var(--accent)" : "#5a5a64", background: h.idx === para ? "var(--accent-soft)" : "transparent" }}>
                {h.text}
              </button>
            ))}
          </div>
        )}

        {/* reading area */}
        <div ref={scroller} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "48px 24px 200px" }}>
          <div style={{ maxWidth: 650, margin: "0 auto", fontFamily: "var(--readfont)" }}>
            {doc.segments.map((seg) => {
              const active = seg.idx === para;
              const status = statusOf(seg.idx);
              const isHeading = seg.type === "heading";
              const opacity = active ? 1 : status === "failed" ? 0.55 : seg.idx < para ? 0.9 : status === "ready" ? 0.82 : status === "generating" ? 0.6 : 0.45;

              return (
                <div key={seg.idx} data-pidx={seg.idx} onClick={() => props.onJump(seg.idx)}
                  style={{ position: "relative", cursor: "pointer", padding: isHeading ? "20px 0 4px 24px" : "9px 0 9px 24px", opacity, transition: "opacity .4s ease" }}>
                  {/* gutter indicators */}
                  {active && <div style={{ position: "absolute", left: -16, right: -20, top: 2, bottom: 2, background: "var(--accent-soft)", borderRadius: 12, opacity: 0.55 }} />}
                  {!active && status === "generating" && <div style={gutter}><Spinner size={13} /></div>}
                  {!active && status === "ready" && <div style={{ ...gutterDot, background: "#27a06a" }} />}
                  {status === "failed" && <div style={gutter}><Warn /></div>}

                  {isHeading ? (
                    <div style={{ position: "relative", fontSize: 12, fontWeight: 600, letterSpacing: ".1em", color: active ? "var(--accent)" : "#26262e", textTransform: "uppercase" }}>{seg.text}</div>
                  ) : (
                    <p style={{ position: "relative", margin: 0, fontSize: 18.5, lineHeight: 1.72, letterSpacing: "-.003em", color: seg.type === "marker" ? "#9a9aa5" : active ? "#16161c" : "#3a3a45", fontStyle: seg.type === "marker" ? "italic" : "normal" }}>{seg.text}</p>
                  )}

                  {status === "failed" && (
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
                      <span style={{ fontSize: 12.5, color: "#c97b22", fontWeight: 500 }}>Couldn't synthesize this paragraph — skipped during playback.</span>
                      <button onClick={(e) => { e.stopPropagation(); props.onRetry(seg.idx); }} style={retryBtn}>Retry</button>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={{ height: 40 }} />
            <div style={{ fontSize: 12.5, color: "#c2c2cc", textAlign: "center", padding: "8px 0" }}>End of document</div>
          </div>
        </div>
      </div>

      {/* toast */}
      {props.toast && (
        <div style={toastStyle}><Warn color="#FFC56B" />{props.toast}</div>
      )}

      <Player
        playing={props.playing} speed={props.speed} playPct={playPct} genPct={genPct}
        section={section} voice={props.voice}
        onToggle={props.onToggle} onPrev={props.onPrev} onNext={props.onNext}
        onCycleSpeed={props.onCycleSpeed} onSeek={onSeek} onOpenVoice={props.onOpenVoice}
      />
    </div>
  );
}

const header: React.CSSProperties = { flex: "none", padding: "13px 22px", display: "flex", alignItems: "center", gap: 13, borderBottom: "1px solid #f0f0f2", background: "#fff", zIndex: 8 };
const backBtn: React.CSSProperties = { width: 32, height: 32, flex: "none", border: "1px solid #ececf0", borderRadius: 9, background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const tocPanel: React.CSSProperties = { width: 220, flex: "none", borderRight: "1px solid #f0f0f2", overflowY: "auto", padding: "20px 6px", background: "#fcfcfd" };
const tocItem: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", border: "none", background: "transparent", fontSize: 12.5, fontWeight: 500, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontFamily: "Geist", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const gutter: React.CSSProperties = { position: "absolute", left: -2, top: 14, width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center" };
const gutterDot: React.CSSProperties = { position: "absolute", left: 3, top: 20, width: 6, height: 6, borderRadius: "50%", opacity: 0.5 };
const retryBtn: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#33333b", background: "#fff", border: "1px solid #e2e2e8", borderRadius: 8, padding: "5px 11px", cursor: "pointer" };
const toastStyle: React.CSSProperties = { position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 118, zIndex: 14, background: "#23232b", color: "#fff", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 11, boxShadow: "0 10px 30px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 9, animation: "dl-pop .25s ease" };
