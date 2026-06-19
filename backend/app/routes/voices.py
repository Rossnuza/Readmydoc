"""Voice picker data + engine health. Thin proxy over the Voicebox contract."""
from fastapi import APIRouter

from ..schemas import HealthOut, Voice
from ..voicebox import VoiceboxError, voicebox

router = APIRouter(tags=["voices"])


@router.get("/voices", response_model=list[Voice])
async def list_voices():
    """List cloned/built-in voices so the user can pick one in-app.

    Returns an empty list (not an error) when Voicebox is unreachable, so the
    UI can show a 'start Voicebox' state instead of crashing.
    """
    try:
        return await voicebox.list_profiles()
    except VoiceboxError:
        return []


@router.get("/health", response_model=HealthOut)
async def health():
    """Drives the 'Voicebox · local' connection badge in the title bar."""
    return HealthOut(backend=True, voicebox=await voicebox.health())
