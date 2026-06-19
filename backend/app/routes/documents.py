"""Ingest + read documents. Covers flow stages 1-3 and 6 (persist/resume)."""
import os
import tempfile

from fastapi import APIRouter, File, HTTPException, UploadFile

from .. import repository as repo
from ..config import settings
from ..pipeline import process
from ..schemas import (
    DocumentOut,
    PasteTextIn,
    PositionIn,
    RecentDoc,
)

router = APIRouter(prefix="/documents", tags=["documents"])

_KIND_BY_EXT = {".pdf": "pdf", ".docx": "docx"}


def _pct(current: int, total: int) -> int:
    return round((current / total) * 100) if total else 0


def _build_response(doc_id: int) -> DocumentOut:
    data = repo.get_document(doc_id)
    if not data:
        raise HTTPException(404, "document not found")
    return DocumentOut(**data)


@router.post("", response_model=DocumentOut)
async def upload(file: UploadFile = File(...)):
    """Stage 1-3: drop a PDF/DOCX -> extract, clean, segment, persist.

    De-dupes on content hash: re-dropping the same file resumes it instantly
    instead of re-processing.
    """
    ext = os.path.splitext(file.filename or "")[1].lower()
    kind = _KIND_BY_EXT.get(ext)
    if not kind:
        raise HTTPException(400, f"unsupported file type: {ext or 'unknown'}")

    raw = await file.read()
    file_hash = repo.hash_bytes(raw)
    existing = repo.find_by_hash(file_hash)
    if existing:
        return _build_response(existing["id"])

    with tempfile.NamedTemporaryFile(suffix=ext, delete=False, dir=settings.upload_dir) as tmp:
        tmp.write(raw)
        tmp_path = tmp.name
    try:
        segments = process(tmp_path, kind)
    finally:
        os.unlink(tmp_path)

    if not segments:
        raise HTTPException(422, "could not extract any readable text from this file")

    title = os.path.splitext(file.filename or "Document")[0]
    subtitle = f"{kind.upper()} · {sum(1 for s in segments if s['type']=='paragraph')} paragraphs"
    doc_id = repo.create_document(file_hash, title, subtitle, kind, segments)
    return _build_response(doc_id)


@router.post("/text", response_model=DocumentOut)
async def paste_text(body: PasteTextIn):
    """Stage 1 alternative: paste raw text."""
    if not body.text.strip():
        raise HTTPException(400, "no text provided")
    file_hash = repo.hash_text(body.text)
    existing = repo.find_by_hash(file_hash)
    if existing:
        return _build_response(existing["id"])

    segments = process(None, "text", text=body.text)
    if not segments:
        raise HTTPException(422, "no readable text after cleaning")
    subtitle = f"TEXT · {sum(1 for s in segments if s['type']=='paragraph')} paragraphs"
    doc_id = repo.create_document(file_hash, body.title, subtitle, "text", segments)
    return _build_response(doc_id)


@router.get("", response_model=list[RecentDoc])
async def recent():
    """'Jump back in' list for the drop screen."""
    out = []
    for r in repo.list_recent():
        out.append(
            RecentDoc(
                id=r["id"],
                title=r["title"],
                subtitle=r["subtitle"],
                source_kind=r["source_kind"],
                total_segments=r["total_segments"],
                current_segment=r["current_segment"] or 0,
                finished=bool(r["finished"]),
                pct=_pct(r["current_segment"] or 0, r["total_segments"]),
            )
        )
    return out


@router.get("/{doc_id}", response_model=DocumentOut)
async def get(doc_id: int):
    return _build_response(doc_id)


@router.put("/{doc_id}/position")
async def update_position(doc_id: int, body: PositionIn):
    """Stage 6: persist position/speed/voice automatically as the user reads."""
    if not repo.get_document(doc_id):
        raise HTTPException(404, "document not found")
    repo.save_position(
        doc_id,
        current_segment=body.current_segment,
        speed=body.speed,
        voice_profile_id=body.voice_profile_id,
        finished=body.finished,
    )
    return {"ok": True}
