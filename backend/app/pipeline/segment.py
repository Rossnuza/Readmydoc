"""Stage 3 — segment cleaned lines into the playback/highlight/jump unit.

Two-pass approach (per the build plan):
  1. Structural: group consecutive body lines into paragraphs; headings and
     table markers stand alone.
  2. Normalise length: merge orphan fragments (< MIN_WORDS) forward, and split
     very long paragraphs (> MAX_WORDS) at sentence boundaries.

Each output segment also carries `section` = the nearest heading above it, so
the frontend can build a table of contents and offer "jump to section".
"""
import re

from .clean import CleanLine

MIN_WORDS = 6     # below this, a body fragment merges into the next paragraph
MAX_WORDS = 380   # above this, split at sentence boundaries
_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z0-9“\"'])")

# Heuristic for PDF/text headings (DOCX headings are already tagged upstream):
# short, no terminal punctuation, mostly title-case or all-caps.
_HEADING_MAX_WORDS = 9


class Segment(dict):
    pass


def _looks_like_heading(text: str) -> bool:
    words = text.split()
    if not (1 <= len(words) <= _HEADING_MAX_WORDS):
        return False
    if text[-1] in ".,:;":
        return False
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return False
    caps = sum(1 for c in letters if c.isupper())
    titleish = sum(1 for w in words if w[:1].isupper())
    return caps / len(letters) > 0.7 or titleish / len(words) > 0.6


def segment(lines: list[CleanLine]) -> list[dict]:
    # ---- pass 1: structural grouping ----
    grouped: list[tuple[str, str]] = []  # (type, text)
    buf: list[str] = []

    def flush():
        if buf:
            grouped.append(("paragraph", " ".join(buf).strip()))
            buf.clear()

    for kind, text in lines:
        if kind == "heading":
            flush()
            grouped.append(("heading", text))
        elif kind == "table":
            flush()
            grouped.append(("marker", text))
        else:  # body text
            if _looks_like_heading(text):
                flush()
                grouped.append(("heading", text))
            else:
                buf.append(text)
    flush()

    # ---- pass 2: length normalisation ----
    normalised: list[tuple[str, str]] = []
    for typ, text in grouped:
        if typ != "paragraph":
            normalised.append((typ, text))
            continue
        for piece in _split_long(text):
            normalised.append(("paragraph", piece))
    normalised = _merge_orphans(normalised)

    # ---- attach section + ordinal ----
    segments: list[dict] = []
    section = None
    idx = 0
    for typ, text in normalised:
        if typ == "heading":
            section = text
        segments.append({"idx": idx, "type": typ, "section": section, "text": text})
        idx += 1
    return segments


def _split_long(text: str) -> list[str]:
    if len(text.split()) <= MAX_WORDS:
        return [text]
    sentences = _SENT_SPLIT.split(text)
    chunks, cur, cur_words = [], [], 0
    for s in sentences:
        sw = len(s.split())
        if cur and cur_words + sw > MAX_WORDS:
            chunks.append(" ".join(cur))
            cur, cur_words = [], 0
        cur.append(s)
        cur_words += sw
    if cur:
        chunks.append(" ".join(cur))
    return chunks


def _merge_orphans(items: list[tuple[str, str]]) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    carry = ""
    for typ, text in items:
        if typ == "paragraph":
            text = (carry + " " + text).strip() if carry else text
            carry = ""
            if len(text.split()) < MIN_WORDS:
                carry = text  # too short — fold into the next paragraph
                continue
            out.append(("paragraph", text))
        else:
            if carry:  # orphan before a heading/marker: keep it rather than lose it
                out.append(("paragraph", carry))
                carry = ""
            out.append((typ, text))
    if carry:
        out.append(("paragraph", carry))
    return out
