"""Stage 2b — strip the clutter. The unsung hero.

This is what makes Doc Listener better than Speechify for dense documents:
  - drop running headers/footers (lines repeated across many pages)
  - drop bare page numbers
  - strip footnote markers
  - de-hyphenate words broken across line wraps
  - mark table-like rows so they're never read aloud as "| 12.4 | 8.1 |"

Input: list of Line dicts from extract.py (text/page/y).
Output: list of (kind, text) tuples where kind is "text" | "heading" | "table".
"""
import re
from collections import Counter

# A line that's almost entirely digits / separators / currency is table-ish.
_TABLE_RE = re.compile(r"^[\s\d.,%$€£\-—|/()]+$")
# Footnote/citation markers: superscript digits, [1], (12) at line ends.
_FOOTNOTE_INLINE = re.compile(r"[¹²³⁰-⁹]+")
_BRACKET_REF = re.compile(r"\[\d{1,3}\]")
_PAGE_NUM_RE = re.compile(r"^(page\s*)?\d{1,4}(\s*/\s*\d{1,4})?$", re.I)
# Cells separated by 2+ spaces or pipes/tabs -> tabular layout.
_MULTI_CELL = re.compile(r"(\S+(\t| {2,}|\s\|\s)){2,}")

CleanLine = tuple[str, str]  # (kind, text)


def _detect_repeating(lines: list[dict]) -> set[str]:
    """Header/footer detection: a short line that appears on many pages at a
    similar vertical position is chrome, not content."""
    pages = {l["page"] for l in lines}
    if len(pages) < 4:
        return set()
    counts: Counter[str] = Counter()
    for l in lines:
        t = l["text"]
        if len(t) <= 90:  # headers/footers are short
            counts[t] += 1
    threshold = max(3, int(len(pages) * 0.5))
    return {t for t, c in counts.items() if c >= threshold}


def clean_lines(lines: list[dict]) -> list[CleanLine]:
    repeating = _detect_repeating(lines)
    out: list[CleanLine] = []

    for l in lines:
        raw = l["text"]

        # DOCX heading marker from the extractor — trust it, pass through.
        if raw.startswith("\x00H\x00"):
            out.append(("heading", raw[3:].strip()))
            continue

        if raw in repeating or _PAGE_NUM_RE.match(raw):
            continue

        # Tables/figures: never read raw cells. Emit a single spoken marker.
        if _TABLE_RE.match(raw) or _MULTI_CELL.search(raw):
            if out and out[-1][0] == "table":
                continue  # collapse consecutive table rows into one marker
            out.append(("table", "Table omitted."))
            continue

        txt = _FOOTNOTE_INLINE.sub("", raw)
        txt = _BRACKET_REF.sub("", txt)
        txt = txt.strip()
        if txt:
            out.append(("text", txt))

    return _dehyphenate(out)


def _dehyphenate(lines: list[CleanLine]) -> list[CleanLine]:
    """Rejoin words split by a hard line wrap: 'competi-' + 'tion'."""
    merged: list[CleanLine] = []
    for kind, txt in lines:
        if (
            merged
            and merged[-1][0] == "text"
            and kind == "text"
            and merged[-1][1].endswith("-")
            and not merged[-1][1].endswith(" -")
        ):
            prev_kind, prev = merged.pop()
            merged.append((prev_kind, prev[:-1] + txt))
        else:
            merged.append((kind, txt))
    return merged
