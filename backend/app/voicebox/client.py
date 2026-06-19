"""The Voice Engine contract — the ONLY place that knows about Voicebox.

Contract (keep this stable; swap the body to change engines):
    text + voice_profile  ->  audio bytes (+ content type)
    list profiles         ->  pickable voices
    health                ->  is the engine reachable right now?

Voicebox endpoints used (base http://127.0.0.1:17493):
    POST /generate    paragraph text -> audio  (the workhorse)
    GET  /profiles    list cloned/built-in voices
    GET  /health      liveness (best-effort)

If you later move to a cloud voice or a different local model, only this file
changes — the pipeline, cache, reader, and resume all stay put.
"""
from __future__ import annotations

import httpx

from ..config import settings


class VoiceboxError(RuntimeError):
    """Raised when the engine is unreachable or returns an error."""


class VoiceboxClient:
    def __init__(self, base_url: str | None = None, timeout: float | None = None):
        self.base_url = (base_url or settings.voicebox_base_url).rstrip("/")
        self.timeout = timeout or settings.voicebox_timeout

    async def health(self) -> bool:
        """Best-effort liveness check for the 'Voicebox · local' badge."""
        try:
            async with httpx.AsyncClient(timeout=3.0) as c:
                r = await c.get(f"{self.base_url}/health")
                return r.status_code < 500
        except httpx.HTTPError:
            # Some builds have no /health; a reachable /profiles also counts.
            try:
                async with httpx.AsyncClient(timeout=3.0) as c:
                    r = await c.get(f"{self.base_url}/profiles")
                    return r.status_code < 500
            except httpx.HTTPError:
                return False

    async def list_profiles(self) -> list[dict]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as c:
                r = await c.get(f"{self.base_url}/profiles")
                r.raise_for_status()
                data = r.json()
        except httpx.HTTPError as e:
            raise VoiceboxError(f"could not list voices: {e}") from e
        # Normalise to {id, name, cloned} regardless of Voicebox's exact shape.
        items = data.get("profiles", data) if isinstance(data, dict) else data
        out: list[dict] = []
        for p in items or []:
            out.append(
                {
                    "id": str(p.get("id") or p.get("profile_id") or p.get("name")),
                    "name": p.get("name") or p.get("id") or "Voice",
                    "cloned": bool(p.get("cloned", p.get("is_cloned", False))),
                }
            )
        return out

    async def generate(
        self, text: str, profile_id: str, language: str = "en"
    ) -> tuple[bytes, str]:
        """Generate speech for one paragraph. Returns (audio_bytes, content_type).

        Speed is intentionally NOT sent — playback rate is applied client-side
        so cached clips are speed-independent and re-used across speeds.
        """
        payload = {"text": text, "profile_id": profile_id, "language": language}
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as c:
                r = await c.post(f"{self.base_url}/generate", json=payload)
                r.raise_for_status()
        except httpx.HTTPError as e:
            raise VoiceboxError(f"generation failed: {e}") from e

        content_type = r.headers.get("content-type", "audio/wav")
        if "json" in content_type:
            # Some builds return a JSON body with a path/base64 instead of bytes.
            body = r.json()
            if "audio_base64" in body:
                import base64

                return base64.b64decode(body["audio_base64"]), "audio/wav"
            if "path" in body:
                with open(body["path"], "rb") as f:
                    return f.read(), "audio/wav"
            raise VoiceboxError("unexpected JSON response from /generate")
        return r.content, content_type


voicebox = VoiceboxClient()
