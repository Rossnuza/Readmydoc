"""Per-paragraph audio cache.

Cache key = (doc_id, segment idx, voice profile). Re-listening and jumping back
are then instant and free. Clips are stored on disk; the DB doesn't need to
track them — presence of the file IS the cache.

If ffmpeg is available we transcode Voicebox's WAV to Opus/WebM (a 100-page doc
is ~2 GB as WAV vs ~80 MB as Opus). Without ffmpeg we keep the WAV.
"""
import asyncio
import shutil
import subprocess
from pathlib import Path

from .config import settings

_FFMPEG = shutil.which("ffmpeg")


def _safe(profile_id: str) -> str:
    return "".join(c if c.isalnum() else "_" for c in profile_id)[:48]


def cache_path(doc_id: int, idx: int, profile_id: str) -> Path:
    ext = "webm" if (settings.prefer_opus and _FFMPEG) else "wav"
    name = f"{doc_id}_{idx}_{_safe(profile_id)}.{ext}"
    return settings.audio_dir / name


def media_type_for(path: Path) -> str:
    return "audio/webm" if path.suffix == ".webm" else "audio/wav"


def is_cached(doc_id: int, idx: int, profile_id: str) -> bool:
    return cache_path(doc_id, idx, profile_id).exists()


async def store(doc_id: int, idx: int, profile_id: str, audio: bytes) -> Path:
    dst = cache_path(doc_id, idx, profile_id)
    if dst.suffix == ".webm" and _FFMPEG:
        await _to_opus(audio, dst)
    else:
        dst.write_bytes(audio)
    return dst


async def _to_opus(wav_bytes: bytes, dst: Path) -> None:
    """Pipe WAV through ffmpeg -> Opus/WebM. Falls back to raw WAV on failure."""
    proc = await asyncio.create_subprocess_exec(
        _FFMPEG, "-hide_banner", "-loglevel", "error",
        "-f", "wav", "-i", "pipe:0",
        "-c:a", "libopus", "-b:a", "32k", "-vbr", "on",
        "-f", "webm", str(dst),
        stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE,
    )
    _, err = await proc.communicate(input=wav_bytes)
    if proc.returncode != 0:
        wav_dst = dst.with_suffix(".wav")
        wav_dst.write_bytes(wav_bytes)
        if dst != wav_dst and dst.exists():
            dst.unlink(missing_ok=True)
        raise RuntimeError(err.decode(errors="ignore") or "ffmpeg transcode failed")
