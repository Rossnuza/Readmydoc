"""SQLite persistence. Single-user, local, zero-setup.

Three tables map directly to the product flow:
  documents — one row per ingested file (file_hash dedupes re-drops)
  segments  — the atomic unit: paragraph/heading text + cache pointer
  sessions  — resume state per document (position, speed, voice)
"""
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from .config import settings

SCHEMA = """
CREATE TABLE IF NOT EXISTS documents (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    file_hash       TEXT UNIQUE NOT NULL,
    title           TEXT NOT NULL,
    subtitle        TEXT,
    source_kind     TEXT NOT NULL,          -- pdf | docx | text
    total_segments  INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS segments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    doc_id      INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    idx         INTEGER NOT NULL,           -- ordinal within the document
    type        TEXT NOT NULL,              -- heading | paragraph | marker
    section     TEXT,                       -- nearest heading above (for TOC/jump)
    text        TEXT NOT NULL,
    UNIQUE(doc_id, idx)
);
CREATE INDEX IF NOT EXISTS idx_segments_doc ON segments(doc_id, idx);

CREATE TABLE IF NOT EXISTS sessions (
    doc_id          INTEGER PRIMARY KEY REFERENCES documents(id) ON DELETE CASCADE,
    current_segment INTEGER NOT NULL DEFAULT 0,
    speed           REAL NOT NULL DEFAULT 1.0,
    voice_profile_id TEXT,
    finished        INTEGER NOT NULL DEFAULT 0,
    last_opened     TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def init_db() -> None:
    settings.ensure_dirs()
    with connect() as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect() -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(settings.db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
