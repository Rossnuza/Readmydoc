"""Doc Listener backend — FastAPI app.

Local, single-user. Talks to Voicebox on 127.0.0.1:17493 for audio and serves
the document pipeline + cache + resume state to the frontend on :8000.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import init_db
from .routes import audio, documents, voices

app = FastAPI(title="Doc Listener", version="0.1.0")

# Local dev: the Vite frontend runs on a different port. Single-user/localhost,
# so a permissive policy is fine here.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


app.include_router(documents.router)
app.include_router(audio.router)
app.include_router(voices.router)


@app.get("/", tags=["meta"])
async def root():
    return {"app": "Doc Listener", "status": "ok"}
