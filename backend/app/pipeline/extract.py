"""Stage 2a — extract raw text lines from a source file.

PDF uses PyMuPDF (fitz): fastest, best layout/reading-order detection, and it
gives us per-line geometry we can use to strip repeating headers/footers.
DOCX uses python-docx: its paragraph model maps almost 1:1 to our segments.

Output is a flat list of `Line` dicts; the cleaner consumes these. Keeping
geometry (page, y) lets the cleaner detect running headers/footers, which is
the single biggest win for dense investor/DFI documents.
"""
from typing import TypedDict


class Line(TypedDict):
    text: str
    page: int
    y: float  # vertical position on the page (top=0); None-equivalent = -1


def extract(path: str, kind: str) -> list[Line]:
    if kind == "pdf":
        return _extract_pdf(path)
    if kind == "docx":
        return _extract_docx(path)
    raise ValueError(f"unsupported kind for file extraction: {kind}")


def _extract_pdf(path: str) -> list[Line]:
    import fitz  # PyMuPDF

    lines: list[Line] = []
    with fitz.open(path) as doc:
        for pageno, page in enumerate(doc):
            # "blocks" gives reading-order text blocks with bounding boxes.
            blocks = page.get_text("blocks")
            # block = (x0, y0, x1, y1, text, block_no, block_type)
            blocks.sort(key=lambda b: (round(b[1] / 3), b[0]))  # top-down, left-right
            for b in blocks:
                if b[6] != 0:  # skip image blocks
                    continue
                for raw in b[4].splitlines():
                    txt = raw.strip()
                    if txt:
                        lines.append({"text": txt, "page": pageno, "y": float(b[1])})
    return lines


def _extract_docx(path: str) -> list[Line]:
    from docx import Document

    doc = Document(path)
    lines: list[Line] = []
    for p in doc.paragraphs:
        txt = p.text.strip()
        if not txt:
            continue
        style = (p.style.name or "").lower() if p.style else ""
        # Tag heading paragraphs so the segmenter can trust the doc's own
        # structure instead of guessing. Prefix is stripped later.
        if style.startswith("heading") or style == "title":
            lines.append({"text": "\x00H\x00" + txt, "page": 0, "y": -1.0})
        else:
            lines.append({"text": txt, "page": 0, "y": -1.0})
    return lines
