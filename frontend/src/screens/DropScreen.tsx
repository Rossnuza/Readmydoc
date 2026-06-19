import { useRef, useState } from "react";
import { Chevron, Check, Doc, Play, Upload } from "../icons";
import type { RecentDoc, Voice } from "../types";

interface Props {
  recent: RecentDoc[];
  voice: Voice | null;
  onOpenVoice: () => void;
  onUpload: (file: File) => void;
  onPasteText: (text: string) => void;
  onOpenDoc: (id: number) => void;
}

const GRAD = "linear-gradient(135deg,#6E6EE6,#9B6BE0)";

export function DropScreen({ recent, voice, onOpenVoice, onUpload, onPasteText, onOpenDoc }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [pasteVal, setPasteVal] = useState("");

  function handleFiles(files: FileList | null) {
    if (files && files[0]) onUpload(files[0]);
  }

  return (
    <div style={{ position: "absolute", inset: 0, overflowY: "auto", padding: "44px 56px 56px" }}>
      <div style={{ maxWidth: 716, margin: "0 auto" }}>
        {/* header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 24, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 11.5, color: "#a0a0ab", fontWeight: 600, letterSpacing: ".14em" }}>LOCAL · PRIVATE · ON-DEVICE</div>
            <h1 style={{ fontSize: 31, fontWeight: 600, margin: "8px 0 0", letterSpacing: "-.025em", color: "#16161c" }}>Listen to your documents</h1>
          </div>
          <button onClick={onOpenVoice} style={voiceChip}>
            <span style={{ ...avatar, background: GRAD }}>{voice?.name?.[0]?.toUpperCase() ?? "A"}</span>
            <span style={{ textAlign: "left", lineHeight: 1.15 }}>
              <span style={{ display: "block", fontSize: 10, color: "#a0a0ab", fontWeight: 500 }}>Reading voice</span>
              <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#33333b" }}>{voice?.name ?? "No voice"}</span>
            </span>
            <Chevron />
          </button>
        </div>

        {/* dropzone */}
        {!pasting ? (
          <button
            onClick={() => fileInput.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            style={{ ...dropzone, borderColor: dragOver ? "var(--accent)" : "#d2d2dc", background: dragOver ? "#f8f8fe" : "#fafafb" }}
          >
            <div style={dropIcon}><Upload /></div>
            <div style={{ fontSize: 18, fontWeight: 600, color: "#26262e", letterSpacing: "-.01em" }}>Drop a PDF or DOCX</div>
            <div style={{ fontSize: 14, color: "#8c8c97", marginTop: 6 }}>or click to browse</div>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 18 }}>
              {["PDF", "DOCX"].map((t) => <span key={t} style={pill}>{t}</span>)}
              <span style={{ ...pill, cursor: "pointer" }} onClick={(e) => { e.stopPropagation(); setPasting(true); }}>PASTE TEXT</span>
            </div>
          </button>
        ) : (
          <div style={{ ...dropzone, padding: 20, cursor: "default" }}>
            <textarea
              autoFocus value={pasteVal} onChange={(e) => setPasteVal(e.target.value)}
              placeholder="Paste your text here…"
              style={{ width: "100%", height: 160, border: "1px solid #ececf0", borderRadius: 12, padding: 14, fontSize: 15, fontFamily: "Geist", resize: "vertical", outline: "none" }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
              <button onClick={() => { setPasting(false); setPasteVal(""); }} style={ghostBtn}>Cancel</button>
              <button onClick={() => pasteVal.trim() && onPasteText(pasteVal)} style={primaryBtn}>Listen</button>
            </div>
          </div>
        )}
        <input ref={fileInput} type="file" accept=".pdf,.docx" hidden onChange={(e) => handleFiles(e.target.files)} />

        {/* jump back in */}
        {recent.length > 0 && (
          <div style={{ marginTop: 36 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#a0a0ab", letterSpacing: ".09em", marginBottom: 13 }}>JUMP BACK IN</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {recent.map((doc) => (
                <div key={doc.id} className="hover-card" onClick={() => onOpenDoc(doc.id)} style={recentRow}>
                  <div style={thumb}><Doc /></div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14.5, fontWeight: 600, color: "#26262e", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.title}</div>
                    <div style={{ fontSize: 12.5, color: "#9a9aa5", marginTop: 3 }}>{doc.subtitle}</div>
                    {!doc.finished && doc.pct > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                        <div style={{ flex: 1, height: 4, background: "#ececf0", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "var(--accent)", borderRadius: 3, width: `${doc.pct}%` }} />
                        </div>
                        <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--accent)" }}>{doc.pct}%</span>
                      </div>
                    )}
                  </div>
                  {doc.finished ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 500, color: "#27a06a" }}><Check />Finished</span>
                  ) : (
                    <span style={resumeBtn}><Play size={13} />{doc.pct > 0 ? "Resume" : "Open"}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const voiceChip: React.CSSProperties = { display: "flex", alignItems: "center", gap: 9, padding: "7px 12px 7px 8px", border: "1px solid #e6e6eb", borderRadius: 12, background: "#fff", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,.03)" };
const avatar: React.CSSProperties = { width: 28, height: 28, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 600 };
const dropzone: React.CSSProperties = { width: "100%", border: "1.5px dashed #d2d2dc", borderRadius: 18, background: "#fafafb", padding: "50px 40px", textAlign: "center", cursor: "pointer", display: "block", transition: "border-color .18s, background .18s" };
const dropIcon: React.CSSProperties = { width: 56, height: 56, borderRadius: 14, background: "#fff", border: "1px solid #ececf0", boxShadow: "0 4px 12px rgba(20,20,40,.07)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" };
const pill: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: "#7a7a85", background: "#f0f0f3", border: "1px solid #e6e6eb", padding: "4px 9px", borderRadius: 7, letterSpacing: ".03em" };
const recentRow: React.CSSProperties = { display: "flex", gap: 15, alignItems: "center", padding: "15px 16px", border: "1px solid #ececf0", borderRadius: 13, background: "#fff", cursor: "pointer" };
const thumb: React.CSSProperties = { width: 42, height: 52, flex: "none", borderRadius: 6, background: "linear-gradient(160deg,#f3f3fb,#e9e9f6)", border: "1px solid #e4e4ee", display: "flex", alignItems: "center", justifyContent: "center" };
const resumeBtn: React.CSSProperties = { flex: "none", display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--accent)", padding: "8px 15px", borderRadius: 9 };
const ghostBtn: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: "#4a4a54", background: "#fff", border: "1px solid #e2e2e8", borderRadius: 9, padding: "9px 16px", cursor: "pointer" };
const primaryBtn: React.CSSProperties = { fontSize: 13.5, fontWeight: 600, color: "#fff", background: "var(--accent)", border: "none", borderRadius: 9, padding: "9px 18px", cursor: "pointer" };
