"""Document pipeline: extract -> clean -> segment.

The output of this package is always an ordered list of `Segment` dicts —
the single primitive everything downstream (generation, cache, highlight,
jump, resume) is built on.
"""
from .extract import extract
from .clean import clean_lines
from .segment import segment

__all__ = ["extract", "clean_lines", "segment", "process"]


def process(raw_path: str | None, kind: str, *, text: str | None = None):
    """Run the full pipeline for a source and return ordered segments.

    kind: "pdf" | "docx" | "text"
    """
    if kind == "text":
        # Normalise pasted text into the same Line shape the extractors produce
        # (text/page/y) so the cleaner can treat every source identically.
        lines = [
            {"text": ln.strip(), "page": 0, "y": -1.0}
            for ln in (text or "").splitlines()
            if ln.strip()
        ]
    else:
        lines = extract(raw_path, kind)
    cleaned = clean_lines(lines)
    return segment(cleaned)
