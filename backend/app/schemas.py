"""Pydantic request/response models for the API surface."""
from pydantic import BaseModel


class SegmentOut(BaseModel):
    idx: int
    type: str           # heading | paragraph | marker
    section: str | None = None
    text: str


class SessionOut(BaseModel):
    current_segment: int = 0
    speed: float = 1.0
    voice_profile_id: str | None = None
    finished: bool = False


class DocumentMeta(BaseModel):
    id: int
    title: str
    subtitle: str | None = None
    source_kind: str
    total_segments: int


class DocumentOut(BaseModel):
    document: DocumentMeta
    segments: list[SegmentOut]
    session: SessionOut


class RecentDoc(BaseModel):
    id: int
    title: str
    subtitle: str | None = None
    source_kind: str
    total_segments: int
    current_segment: int = 0
    finished: bool = False
    pct: int = 0


class PasteTextIn(BaseModel):
    title: str = "Pasted text"
    text: str


class PositionIn(BaseModel):
    current_segment: int | None = None
    speed: float | None = None
    voice_profile_id: str | None = None
    finished: bool | None = None


class Voice(BaseModel):
    id: str
    name: str
    cloned: bool = False


class HealthOut(BaseModel):
    backend: bool = True
    voicebox: bool
