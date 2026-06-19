import { useCallback, useEffect, useState } from "react";
import { api } from "./api";
import { VoicePicker } from "./components/VoicePicker";
import { DropScreen } from "./screens/DropScreen";
import { ProcessingScreen } from "./screens/ProcessingScreen";
import { ReaderScreen } from "./screens/ReaderScreen";
import { usePlayer } from "./usePlayer";
import type { DocumentOut, RecentDoc, Voice } from "./types";

type Screen = "drop" | "processing" | "reader";

export function App() {
  const [screen, setScreen] = useState<Screen>("drop");
  const [recent, setRecent] = useState<RecentDoc[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [voice, setVoice] = useState<Voice | null>(null);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [voiceboxOnline, setVoiceboxOnline] = useState(false);
  const [doc, setDoc] = useState<DocumentOut | null>(null);
  const [processingName, setProcessingName] = useState("");
  const [processingDone, setProcessingDone] = useState(false);
  const [toast, setToast] = useState("");

  const player = usePlayer(doc, voice?.id ?? null);

  // ---- bootstrap: health, voices, recent docs ----
  const refresh = useCallback(async () => {
    try {
      const [h, vs, rs] = await Promise.all([api.health(), api.voices(), api.recent()]);
      setVoiceboxOnline(h.voicebox);
      setVoices(vs);
      setRecent(rs);
      setVoice((cur) => cur ?? vs[0] ?? null);
    } catch {
      /* backend not up yet */
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(() => api.health().then((h) => setVoiceboxOnline(h.voicebox)).catch(() => {}), 8000);
    return () => clearInterval(t);
  }, [refresh]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2800);
  }

  // ---- ingest ----
  async function ingest(promise: Promise<DocumentOut>, name: string) {
    setProcessingName(name);
    setProcessingDone(false);
    setScreen("processing");
    try {
      const result = await promise;
      setProcessingDone(true);
      // small beat so the stepper resolves nicely
      window.setTimeout(() => { setDoc(result); setScreen("reader"); }, 500);
    } catch (e) {
      flash(e instanceof Error ? e.message : "Could not process that file");
      setScreen("drop");
    }
  }

  const onUpload = (file: File) => ingest(api.upload(file), file.name);
  const onPasteText = (text: string) => ingest(api.pasteText("Pasted text", text), "Pasted text");

  async function onOpenDoc(id: number) {
    try {
      const d = await api.getDocument(id);
      setDoc(d);
      setScreen("reader");
    } catch {
      flash("Could not open that document");
    }
  }

  function onBack() {
    player.stop();
    setDoc(null);
    setScreen("drop");
    refresh();
  }

  function pickVoice(v: Voice) {
    setVoice(v);
    setVoiceOpen(false);
    if (doc) api.savePosition(doc.document.id, { voice_profile_id: v.id }).catch(() => {});
  }

  // ---- keyboard shortcuts (reader) ----
  useEffect(() => {
    if (screen !== "reader") return;
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) return;
      if (e.code === "Space") { e.preventDefault(); player.togglePlay(); }
      else if (e.code === "ArrowRight") { e.preventDefault(); player.nextPara(); }
      else if (e.code === "ArrowLeft") { e.preventDefault(); player.prevPara(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [screen, player]);

  // highest cached idx for the scrubber's "generated" fill
  const genFrontier = player.state.cached.size
    ? Math.max(...Array.from(player.state.cached))
    : player.state.para;

  return (
    <div className="app-shell">
      <div className="window">
        {/* title bar */}
        <div style={titleBar}>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ ...dot, background: "#FF5F57" }} />
            <span style={{ ...dot, background: "#FEBC2E" }} />
            <span style={{ ...dot, background: "#28C840" }} />
          </div>
          <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 500, color: "#7a7a85" }}>Doc Listener</div>
          <div style={{ ...badge, ...(voiceboxOnline ? badgeOn : badgeOff) }} title="Local Voicebox server · 127.0.0.1:17493">
            <span style={{ ...badgeDot, background: voiceboxOnline ? "#27A06A" : "#C0392B", boxShadow: `0 0 0 3px ${voiceboxOnline ? "rgba(39,160,106,.18)" : "rgba(192,57,43,.16)"}` }} />
            {voiceboxOnline ? "Voicebox · local" : "Voicebox offline"}
          </div>
        </div>

        {/* body */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", background: "#fff" }}>
          {screen === "drop" && (
            <DropScreen
              recent={recent} voice={voice}
              onOpenVoice={() => setVoiceOpen(true)}
              onUpload={onUpload} onPasteText={onPasteText} onOpenDoc={onOpenDoc}
            />
          )}
          {screen === "processing" && <ProcessingScreen fileName={processingName} done={processingDone} />}
          {screen === "reader" && doc && (
            <ReaderScreen
              doc={doc} voice={voice}
              para={player.state.para} playing={player.state.playing} speed={player.state.speed}
              genFrontier={genFrontier} statusOf={player.statusOf} toast={toast}
              onBack={onBack} onToggle={player.togglePlay} onPrev={player.prevPara} onNext={player.nextPara}
              onCycleSpeed={player.cycleSpeed} onJump={player.jumpTo} onRetry={player.retry}
              onOpenVoice={() => setVoiceOpen(true)}
            />
          )}
        </div>

        {voiceOpen && (
          <VoicePicker
            voices={voices} selectedId={voice?.id ?? null} voiceboxOnline={voiceboxOnline}
            onPick={pickVoice} onClose={() => setVoiceOpen(false)}
          />
        )}

        {/* drop-screen toast */}
        {toast && screen !== "reader" && <div style={toastStyle}>{toast}</div>}
      </div>
    </div>
  );
}

const titleBar: React.CSSProperties = { height: 44, flex: "none", background: "#f6f6f8", borderBottom: "1px solid #eaeaee", display: "flex", alignItems: "center", padding: "0 16px", gap: 8, zIndex: 30 };
const dot: React.CSSProperties = { width: 11, height: 11, borderRadius: "50%" };
const badge: React.CSSProperties = { display: "flex", alignItems: "center", gap: 7, fontSize: 12, padding: "3px 10px", borderRadius: 20, fontWeight: 600 };
const badgeOn: React.CSSProperties = { color: "#218a5b", background: "#eaf7f0", border: "1px solid #d2ebdd" };
const badgeOff: React.CSSProperties = { color: "#a23b2d", background: "#fbecea", border: "1px solid #f0d4cf" };
const badgeDot: React.CSSProperties = { width: 7, height: 7, borderRadius: "50%" };
const toastStyle: React.CSSProperties = { position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: 40, zIndex: 50, background: "#23232b", color: "#fff", fontSize: 13, fontWeight: 500, padding: "10px 16px", borderRadius: 11, boxShadow: "0 10px 30px rgba(0,0,0,.25)", animation: "dl-pop .25s ease" };
