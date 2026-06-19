import { Check, Close, Mic } from "../icons";
import type { Voice } from "../types";

interface Props {
  voices: Voice[];
  selectedId: string | null;
  voiceboxOnline: boolean;
  onPick: (v: Voice) => void;
  onClose: () => void;
}

const GRADS = [
  "linear-gradient(135deg,#6E6EE6,#9B6BE0)",
  "linear-gradient(135deg,#3FA9C9,#5BC6A8)",
  "linear-gradient(135deg,#E08A4B,#E0B14B)",
  "linear-gradient(135deg,#27A06A,#5BC68A)",
];

export function VoicePicker({ voices, selectedId, voiceboxOnline, onPick, onClose }: Props) {
  return (
    <div onClick={onClose} style={backdrop}>
      <div onClick={(e) => e.stopPropagation()} style={panel}>
        <div style={head}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: "#1b1b22", letterSpacing: "-.01em" }}>Reading voice</div>
            <div style={{ fontSize: 12.5, color: "#9a9aa5", marginTop: 2 }}>Synthesized locally with Voicebox</div>
          </div>
          <button onClick={onClose} style={closeBtn}><Close color="#7a7a85" /></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px 6px" }}>
          {!voiceboxOnline && (
            <div style={offline}>
              Voicebox isn't running. Start the Voicebox app so its server is live at
              <code style={{ margin: "0 4px" }}>127.0.0.1:17493</code>, then reopen this.
            </div>
          )}
          {voiceboxOnline && voices.length === 0 && (
            <div style={offline}>No voices found. Clone or add a voice in the Voicebox app first.</div>
          )}
          {voices.map((v, i) => {
            const selected = v.id === selectedId;
            return (
              <div key={v.id} onClick={() => onPick(v)} style={{ ...row, border: `1.5px solid ${selected ? "var(--accent)" : "transparent"}`, background: selected ? "var(--accent-soft)" : "#fff" }}>
                <span style={{ ...avatar, background: GRADS[i % GRADS.length] }}>{v.name[0]?.toUpperCase()}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "#2a2a32" }}>{v.name}</span>
                    {v.cloned && <span style={clonedTag}>CLONED</span>}
                  </div>
                </div>
                {selected ? (
                  <span style={selDot}><Check size={13} color="#fff" /></span>
                ) : (
                  <span style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid #e0e0e6" }} />
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: 12, borderTop: "1px solid #f0f0f2" }}>
          <div style={cloneHint}>
            <Mic size={16} color="#7a7a85" />
            <span>To clone your own voice, record a short sample in the <strong>Voicebox app</strong> — it appears here automatically.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const backdrop: React.CSSProperties = { position: "absolute", inset: 0, background: "rgba(22,22,30,.32)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "center", animation: "dl-fadein .18s ease" };
const panel: React.CSSProperties = { width: 480, maxHeight: 600, background: "#fff", borderRadius: 18, boxShadow: "0 30px 80px -20px rgba(10,10,30,.5)", overflow: "hidden", display: "flex", flexDirection: "column", animation: "dl-pop .22s ease" };
const head: React.CSSProperties = { padding: "20px 22px 16px", borderBottom: "1px solid #f0f0f2", display: "flex", alignItems: "center", justifyContent: "space-between" };
const closeBtn: React.CSSProperties = { width: 30, height: 30, border: "none", background: "#f2f2f5", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const row: React.CSSProperties = { display: "flex", alignItems: "center", gap: 13, padding: "11px 12px", borderRadius: 12, cursor: "pointer", marginBottom: 6, transition: "background .12s" };
const avatar: React.CSSProperties = { width: 38, height: 38, flex: "none", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 600 };
const clonedTag: React.CSSProperties = { fontSize: 10, fontWeight: 600, color: "var(--accent)", background: "var(--accent-soft)", padding: "2px 7px", borderRadius: 6, letterSpacing: ".02em" };
const selDot: React.CSSProperties = { width: 20, height: 20, flex: "none", borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" };
const offline: React.CSSProperties = { fontSize: 13, color: "#8c6a2b", background: "#fdf6e7", border: "1px solid #f0e3c2", borderRadius: 10, padding: "12px 14px", lineHeight: 1.5, margin: "4px 0 8px" };
const cloneHint: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9, fontSize: 12.5, color: "#7a7a85", lineHeight: 1.45, padding: "4px 6px" };
