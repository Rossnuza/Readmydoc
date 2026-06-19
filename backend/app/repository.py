"""Thin data-access layer over SQLite — keeps routes readable."""
import hashlib

from .db import connect


def hash_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def hash_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def find_by_hash(file_hash: str) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT * FROM documents WHERE file_hash = ?", (file_hash,)
        ).fetchone()
        return dict(row) if row else None


def create_document(
    file_hash: str, title: str, subtitle: str | None, kind: str, segments: list[dict]
) -> int:
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO documents (file_hash, title, subtitle, source_kind, total_segments)
               VALUES (?, ?, ?, ?, ?)""",
            (file_hash, title, subtitle, kind, len(segments)),
        )
        doc_id = cur.lastrowid
        conn.executemany(
            """INSERT INTO segments (doc_id, idx, type, section, text)
               VALUES (?, ?, ?, ?, ?)""",
            [(doc_id, s["idx"], s["type"], s.get("section"), s["text"]) for s in segments],
        )
        conn.execute("INSERT INTO sessions (doc_id) VALUES (?)", (doc_id,))
        return doc_id


def get_document(doc_id: int) -> dict | None:
    with connect() as conn:
        doc = conn.execute("SELECT * FROM documents WHERE id = ?", (doc_id,)).fetchone()
        if not doc:
            return None
        segs = conn.execute(
            "SELECT idx, type, section, text FROM segments WHERE doc_id = ? ORDER BY idx",
            (doc_id,),
        ).fetchall()
        sess = conn.execute(
            "SELECT * FROM sessions WHERE doc_id = ?", (doc_id,)
        ).fetchone()
        return {
            "document": dict(doc),
            "segments": [dict(s) for s in segs],
            "session": dict(sess) if sess else None,
        }


def get_segment_text(doc_id: int, idx: int) -> dict | None:
    with connect() as conn:
        row = conn.execute(
            "SELECT idx, type, text FROM segments WHERE doc_id = ? AND idx = ?",
            (doc_id, idx),
        ).fetchone()
        return dict(row) if row else None


def list_recent(limit: int = 8) -> list[dict]:
    with connect() as conn:
        rows = conn.execute(
            """SELECT d.id, d.title, d.subtitle, d.source_kind, d.total_segments,
                      s.current_segment, s.finished, s.last_opened
               FROM documents d
               LEFT JOIN sessions s ON s.doc_id = d.id
               ORDER BY s.last_opened DESC
               LIMIT ?""",
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]


def save_position(
    doc_id: int,
    current_segment: int | None = None,
    speed: float | None = None,
    voice_profile_id: str | None = None,
    finished: bool | None = None,
) -> None:
    sets, vals = ["last_opened = datetime('now')"], []
    if current_segment is not None:
        sets.append("current_segment = ?"); vals.append(current_segment)
    if speed is not None:
        sets.append("speed = ?"); vals.append(speed)
    if voice_profile_id is not None:
        sets.append("voice_profile_id = ?"); vals.append(voice_profile_id)
    if finished is not None:
        sets.append("finished = ?"); vals.append(1 if finished else 0)
    vals.append(doc_id)
    with connect() as conn:
        conn.execute(f"UPDATE sessions SET {', '.join(sets)} WHERE doc_id = ?", vals)
