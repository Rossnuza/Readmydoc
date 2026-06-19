# Doc Listener

A local, single-user desktop app that turns long working documents (investor
memos, financial models, DFI reports) into a clean, listenable audio reading in
a voice you choose — that you follow along with on screen and resume exactly
where you left off.

**Powered by [Voicebox.sh](https://voicebox.sh)** — a free, open-source,
local-first voice studio (Qwen3-TTS) that runs entirely on your machine and
exposes a REST API at `http://127.0.0.1:17493`. Doc Listener never builds a TTS
engine; it *calls* Voicebox for audio and builds the document-reading
experience around it.

```
Drop PDF/DOCX → Extract → Clean → Segment → Index → [Voicebox] Generate → Cache → Play+Highlight → Resume
```

## Architecture

```
┌──────────────────────────────┐
│  Frontend (Vite + React)     │   reader UI, highlight + auto-scroll,
│  src: frontend/              │   audio playback, voice picker
└──────────────┬───────────────┘
               │ HTTP  (localhost:8000)
┌──────────────▼───────────────┐
│  Backend (FastAPI)           │   PDF/DOCX extraction, clean, segment,
│  src: backend/               │   TOC index, Voicebox proxy, audio cache,
│                              │   SQLite (documents · segments · sessions)
└──────────────┬───────────────┘
               │ HTTP  (127.0.0.1:17493)
┌──────────────▼───────────────┐
│  Voicebox (you run this)     │   voice cloning + speech generation
└──────────────────────────────┘
```

The **Voice Engine contract** (`backend/app/voicebox/client.py`) is a single
swappable layer: `text + voiceProfile → audio + duration + status`. Swap to a
cloud voice later and only this file changes.

## Quick start

### 0. One-time setup
1. Install [Voicebox](https://voicebox.sh) and let it pull the Qwen3-TTS model.
2. Clone the voice you want (a few seconds of clean audio) → note its
   `profile_id`. Or use a built-in voice.
3. Make sure Voicebox's server is running at `http://127.0.0.1:17493`.

### 1. Backend
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
> Optional but recommended: install `ffmpeg` so generated audio is cached as
> Opus (~80 MB for a 100-page doc) instead of WAV (~2 GB). Without ffmpeg the
> app still works, it just caches WAV.

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
Open the printed URL.

## MVP scope (V1)

1. Drop PDF/DOCX → clean text.
2. One good voice, per-paragraph generation with lookahead + cache.
3. Reader: play/pause, speed, skip, click-to-jump, highlight + auto-scroll.
4. Resume position per document.

**Definition of done:** finishing a real 100-page investor document with it.

### Parked for V2
Word-by-word karaoke highlight, Chrome/Google Docs integration, mobile,
switching voices mid-document.
