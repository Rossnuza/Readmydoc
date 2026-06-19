import { Next, Pause, Play, Prev } from "../icons";
import type { Voice } from "../types";

interface Props {
  playing: boolean;
  speed: number;
  playPct: number;   // 0..100 played
  genPct: number;    // 0..100 generated (lookahead frontier)
  section: string | null;
  voice: Voice | null;
  onToggle: () => void;
  onPrev: () => void;
  onNext: () => void;
  onCycleSpeed: () => void;
  onSeek: (fraction: number) => void;
  onOpenVoice: () => void;
}

const GRAD = "linear-gradient(135deg,#6E6EE6,#9B6BE0)";

export function Player(p: Props) {
  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    p.onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
  }

  return (
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "0 22px 22px", zIndex: 12, pointerEvents: "none" }}>
      <div style={shell}>
        {/* section label */}
        {p.section && (
          <div style={{ fontSize: 11, fontWeight: 600, color: "#9a9aa5", letterSpacing: ".05em", textTransform: "uppercase", marginBottom: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {p.section}
          </div>
        )}

        {/* scrubber: grey track, dotted = generated, solid = played */}
        <div onClick={seek} style={{ position: "relative", height: 16, display: "flex", alignItems: "center", cursor: "pointer", marginBottom: 6 }}>
          <div style={{ position: "absolute", left: 0, right: 0, height: 5, background: "#eaeaef", borderRadius: 3 }} />
          <div title="Audio generated" style={{ position: "absolute", left: 0, height: 5, width: `${p.genPct}%`, opacity: 0.9, borderRadius: 3, background: "repeating-linear-gradient(90deg,#D7D7E8 0,#D7D7E8 3px,transparent 3px,transparent 7px)" }} />
          <div style={{ position: "absolute", left: 0, height: 5, width: `${p.playPct}%`, background: "var(--accent)", borderRadius: 3 }} />
          <div style={{ position: "absolute", width: 13, height: 13, borderRadius: "50%", background: "#fff", border: "2px solid var(--accent)", boxShadow: "0 1px 4px rgba(0,0,0,.18)", left: `${p.playPct}%`, transform: "translateX(-50%)" }} />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span style={{ flex: 1 }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <button onClick={p.onPrev} title="Previous paragraph (←)" style={iconBtn}><Prev /></button>
            <button onClick={p.onToggle} style={playBtn}>{p.playing ? <Pause /> : <Play />}</button>
            <button onClick={p.onNext} title="Next paragraph (→)" style={iconBtn}><Next /></button>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
            <button onClick={p.onCycleSpeed} title="Playback speed" style={speedBtn}>{p.speed}×</button>
            <button onClick={p.onOpenVoice} title="Change voice" style={{ ...voiceBtn, background: GRAD }}>{p.voice?.name?.[0]?.toUpperCase() ?? "A"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const shell: React.CSSProperties = { maxWidth: 712, margin: "0 auto", background: "rgba(255,255,255,.86)", backdropFilter: "blur(20px) saturate(1.4)", WebkitBackdropFilter: "blur(20px) saturate(1.4)", border: "1px solid rgba(0,0,0,.06)", borderRadius: 18, boxShadow: "0 18px 50px -16px rgba(20,20,46,.32), 0 2px 6px rgba(0,0,0,.04)", padding: "13px 18px 14px", pointerEvents: "auto" };
const iconBtn: React.CSSProperties = { width: 36, height: 36, border: "none", background: "transparent", borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#5a5a64" };
const playBtn: React.CSSProperties = { width: 50, height: 50, border: "none", borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--accent)", boxShadow: "0 6px 16px -4px var(--accent-soft), 0 3px 8px rgba(91,91,214,.3)", color: "#fff" };
const speedBtn: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "#4a4a54", background: "#f1f1f4", border: "1px solid #e6e6eb", borderRadius: 9, padding: "7px 9px", cursor: "pointer", minWidth: 46 };
const voiceBtn: React.CSSProperties = { width: 34, height: 34, borderRadius: "50%", border: "1.5px solid #fff", boxShadow: "0 0 0 1px #e6e6eb", cursor: "pointer", color: "#fff", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center" };
