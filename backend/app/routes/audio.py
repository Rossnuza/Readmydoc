"""Stage 4-5: generate (via Voicebox) + serve cached paragraph audio.

The frontend drives the lookahead buffer: while paragraph N plays it requests
audio for N+1..N+3. Each request here is idempotent — if the clip is already
cached it's served instantly; otherwise it's generated once, cached, and served.

Two endpoints:
  GET /audio/{doc_id}/{idx}        -> the audio clip (generates on miss)
  GET /audio/{doc_id}/{idx}/status -> ready | generating-able | failed (cheap)
"""
import asyncio

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse, Response

from .. import audio_cache, repository as repo
from ..voicebox import VoiceboxError, voicebox

router = APIRouter(prefix="/audio", tags=["audio"])

# Coalesce concurrent requests for the same clip so the lookahead buffer never
# triggers duplicate generations of the same paragraph.
_inflight: dict[tuple[int, int, str], asyncio.Lock] = {}


def _lock(key: tuple[int, int, str]) -> asyncio.Lock:
    return _inflight.setdefault(key, asyncio.Lock())


@router.get("/{doc_id}/{idx}")
async def get_audio(doc_id: int, idx: int, voice: str = Query(..., description="profile_id")):
    seg = repo.get_segment_text(doc_id, idx)
    if not seg:
        raise HTTPException(404, "segment not found")
    if seg["type"] == "marker":
        # Markers ("Table omitted.") still get spoken so playback stays continuous.
        pass

    path = audio_cache.cache_path(doc_id, idx, voice)
    if path.exists():
        return FileResponse(path, media_type=audio_cache.media_type_for(path))

    key = (doc_id, idx, voice)
    async with _lock(key):
        # Re-check: another request may have generated it while we waited.
        if path.exists():
            return FileResponse(path, media_type=audio_cache.media_type_for(path))
        try:
            audio, _ = await voicebox.generate(seg["text"], voice)
        except VoiceboxError as e:
            raise HTTPException(502, f"voicebox: {e}") from e
        stored = await audio_cache.store(doc_id, idx, voice, audio)
    return FileResponse(stored, media_type=audio_cache.media_type_for(stored))


@router.get("/{doc_id}/{idx}/status")
async def get_status(doc_id: int, idx: int, voice: str = Query(...)):
    """Cheap check used to paint the gutter dots (cached vs not-yet)."""
    seg = repo.get_segment_text(doc_id, idx)
    if not seg:
        raise HTTPException(404, "segment not found")
    return {"cached": audio_cache.is_cached(doc_id, idx, voice)}


@router.head("/{doc_id}/{idx}")
async def head_audio(doc_id: int, idx: int, voice: str = Query(...)):
    cached = audio_cache.is_cached(doc_id, idx, voice)
    return Response(status_code=200 if cached else 404)
