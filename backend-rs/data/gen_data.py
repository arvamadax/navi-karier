"""Regenerate backend-rs/data/*.json from the Python backend + PyPDF2 (run from repo root).

    python backend-rs/data/gen_data.py

Output is committed; the Rust crate embeds it with include_str!.
"""
import json
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root / "backend"))
out = Path(__file__).parent


def write(name, text):
    (out / name).write_text(text, encoding="utf-8", newline="\n")


from app.ai_service import SYSTEM_PROMPT  # noqa: E402
from app.services import COURSE_MAP, ROLE_SKILL_MAP  # noqa: E402
from app.skkni_reference import SKKNI_REFERENCE  # noqa: E402
from PyPDF2._codecs import adobe_glyphs, charset_encoding  # noqa: E402
from PyPDF2._codecs.pdfdoc import _pdfdoc_encoding  # noqa: E402

write("role_skill_map.json", json.dumps(ROLE_SKILL_MAP, ensure_ascii=False))
write("course_map.json", json.dumps(COURSE_MAP, ensure_ascii=False))
write(
    "skkni.json",
    json.dumps(
        {k: {f: v[f] for f in ("scheme_name", "regulation", "note")} for k, v in SKKNI_REFERENCE.items()},
        ensure_ascii=False,
    ),
)
write("system_prompt.txt", SYSTEM_PROMPT)
write(
    "pypdf2_tables.json",
    json.dumps(
        {"glyphs": adobe_glyphs, "charset": charset_encoding, "pdfdoc": _pdfdoc_encoding},
        ensure_ascii=True,
        separators=(",", ":"),
    ),
)
