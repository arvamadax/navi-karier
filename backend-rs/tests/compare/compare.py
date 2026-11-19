"""Side-by-side conformance test: Python (FastAPI) backend vs Rust backend on ONE Postgres.

    python backend-rs/tests/compare/compare.py [--rust-bin PATH] [--database-url URL]

* Needs the Python backend's deps (see backend/requirements.txt; SQLAlchemy 2.1 defaults
  `postgresql://` to psycopg3, so this script passes `postgresql+psycopg2://`), `requests`,
  and for the PDF corpus `reportlab`. Without --database-url an embedded Postgres is started
  through `pgserver` (pip install pgserver).
* Creates a fresh database, applies Alembic (like the deploy does), boots uvicorn once so
  `Base.metadata.create_all` adds job_roles/invites (Alembic does not know them), then starts the
  Rust binary against the same database.
* Every scenario step runs against both servers. Users are namespaced per backend so they
  do not collide; ids, tokens and timestamps are masked before comparing. Global (platform-wide)
  endpoints are called back-to-back without writes in between, so they see identical data.
* Exit code 1 if any response differs.
"""
import argparse
import http.server
import json
import threading
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[3]
BACKEND = ROOT / "backend"
SECRET = "compare-jwt-secret"
OAUTH = "compare-oauth-secret"
PY_PORT, RS_PORT = 18001, 18002
PY_AI_PORT, RS_AI_PORT, MOCK_PORT = 18004, 18005, 18003
ENV_COMMON = {
    "JWT_SECRET": SECRET,
    "OAUTH_BRIDGE_SECRET": OAUTH,
    "FRONTEND_URL": "https://app.example.test",
    "CORS_ORIGINS": "http://localhost:3000,https://app.example.test",
    "CONTACT_EMAIL": "contact@example.test",
}


def sqlalchemy_url(url: str) -> str:
    return url.replace("postgresql://", "postgresql+psycopg2://", 1) if "+psycopg" not in url else url


def wait_health(port: int, proc: subprocess.Popen, name: str):
    for _ in range(120):
        if proc.poll() is not None:
            sys.exit(f"{name} exited early (code {proc.returncode})")
        try:
            if requests.get(f"http://127.0.0.1:{port}/api/health", timeout=1).json()["database"] == "ok":
                return
        except Exception:
            time.sleep(0.5)
    sys.exit(f"{name} did not become healthy")


# ---------------------------------------------------------------------------- normalisation

TS = re.compile(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(\.\d{6})?$")
MASK_KEYS = {"id", "analysis_id", "cv_id", "access_token", "token", "user_id"}


def norm(v, ns, key=None):
    if isinstance(v, dict):
        return [(k, norm(x, ns, k)) for k, x in v.items()]  # list of pairs => key ORDER is compared too
    if isinstance(v, list):
        return [norm(x, ns) for x in v]
    if key in MASK_KEYS and v is not None:
        return "<masked>"
    if isinstance(v, str):
        if TS.match(v):
            return "<ts>"
        v = re.sub(r"/invite/[A-Za-z0-9_-]+", "/invite/<token>", v)
        v = re.sub(r"guest\+[A-Za-z0-9_-]+@", "guest+<token>@", v)
        return v if ns is None else v.replace(f".{ns}.test", ".NS.test").replace(f"-{ns}", "-NS")
    return v


class Backend:
    def __init__(self, ns, port):
        self.ns, self.base = ns, f"http://127.0.0.1:{port}"
        self.tokens, self.ids = {}, {}

    def call(self, method, path, token=None, **kw):
        headers = kw.pop("headers", {})
        if token:
            headers["Authorization"] = f"Bearer {self.tokens.get(token, token)}"
        r = requests.request(method, self.base + path, headers=headers, timeout=60, **kw)
        try:
            body = r.json()
        except ValueError:
            body = r.text
        return r.status_code, body


class Harness:
    def __init__(self, py, rs):
        self.py, self.rs, self.diffs, self.total = py, rs, [], 0

    def both(self, label, fn, shared=False):
        """fn(backend) -> (status, body); executed on Python then Rust, compared after masking."""
        self.total += 1
        a, b = fn(self.py), fn(self.rs)
        # shared=True: platform-wide data contains both namespaces, so don't fold either one.
        na = (a[0], norm(a[1], None if shared else self.py.ns))
        nb = (b[0], norm(b[1], None if shared else self.rs.ns))
        ok = na == nb
        print(f"{'OK  ' if ok else 'DIFF'} {label}: py={a[0]} rs={b[0]}")
        if not ok:
            self.diffs.append((label, a, b))
        return a, b

    def req(self, label, method, path, token=None, shared=False, **kw):
        def fn(be):
            k = dict(kw)
            for key in ("json", "data", "files"):
                if callable(k.get(key)):
                    k[key] = k[key](be)
            return be.call(method, path(be) if callable(path) else path, token=token, **k)

        return self.both(label, fn, shared=shared)


# ---------------------------------------------------------------------------- PDFs

def make_pdfs(d: Path) -> list[Path]:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfgen import canvas

    cv_lines = [
        "Budi Santoso", "Software Engineer - Jakarta", "budi@example.com | +62 812 3456 7890",
        "Pengalaman: 5 tahun backend dengan Python, SQL, Docker dan Kubernetes.",
        "Pendidikan: S1 Teknik Informatika, Universitas Indonesia (2016-2020)",
        "Skill: Python, JavaScript/TypeScript, React, Node.js, Git, CI/CD, Testing",
        "Café, naïve, résumé, 100% — “quotes” and – dashes • bullets",
    ]
    out = []

    def simple(name, font, size=11, pages=1, ttf=None, two_col=False):
        p = d / name
        c = canvas.Canvas(str(p), pagesize=A4)
        if ttf:
            pdfmetrics.registerFont(TTFont("TT", ttf))
            font = "TT"
        for pg in range(pages):
            y = 800
            for i, line in enumerate(cv_lines * (2 if pages > 1 else 1)):
                c.setFont(font, size + (4 if i == 0 else 0))
                c.drawString(60, y, line)
                if two_col and i % 2:
                    c.drawString(330, y, f"Kolom kanan {i}: SQL Python Docker")
                y -= 22
            c.drawString(60, 60, f"Halaman {pg + 1}")
            c.showPage()
        c.save()
        out.append(p)

    simple("helvetica.pdf", "Helvetica")
    simple("times_3pages.pdf", "Times-Roman", pages=3)
    simple("courier_cols.pdf", "Courier", two_col=True)
    for ttf in ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/calibri.ttf"):
        if Path(ttf).exists():
            simple(f"ttf_{Path(ttf).stem}.pdf", None, ttf=ttf, pages=2)
    # TJ kerning / word-space / leading operators
    p = d / "tj_spacing.pdf"
    c = canvas.Canvas(str(p), pagesize=A4)
    t = c.beginText(60, 780)
    t.setFont("Helvetica", 11)
    t.textLine("Line one with Python and SQL")
    t.setWordSpace(4)
    t.textLine("Line two   with   extra   spaces")
    t.setLeading(30)
    t.textLine("Line three far below")
    c.drawText(t)
    c.showPage()
    c.save()
    out.append(p)
    # Browser-generated (Skia / Type0 Identity-H: the typical "Save as PDF" CV)
    import glob
    edge = next((x for x in (*glob.glob(r"C:\Program Files (x86)\Microsoft\EdgeCore\*\msedge.exe"),
                             r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
                             r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
                             r"C:\Program Files\Google\Chrome\Application\chrome.exe") if Path(x).exists()), None)
    if edge:
        long_para = " ".join(f"Kalimat {i} tentang pengalaman SQL, Python dan Docker di perusahaan teknologi." for i in range(60))
        pages = {
            "browser_print": "<h1>Siti Rahma</h1><p>Data Analyst - Bandung</p><ul><li>SQL, Python, Excel, Tableau</li>"
                             "<li>Statistik &amp; Machine Learning</li></ul><table><tr><td>Bahasa</td><td>Indonesia, English</td></tr></table>"
                             "<p>Café résumé naïve — “kutipan”</p>",
            "browser_two_column": "<div style='display:flex'><div style='width:30%;background:#eee'><h3>Kontak</h3><p>siti@example.com</p>"
                                  "<h3>Skill</h3><p>Python<br>SQL<br>Docker</p></div><div style='width:70%'><h2>Pengalaman</h2>"
                                  "<p><b>Data Analyst</b> — PT Maju (2020–2024)</p><ul><li>Membangun dashboard</li><li>Optimasi query</li></ul></div></div>",
            "browser_long_3pages": f"<h1>Riwayat</h1><p style='text-align:justify'>{long_para}</p><h2>Proyek</h2><p style='text-align:justify'>{long_para}</p>",
            "browser_unicode": "<p>日本語のテキスト 中文 한국어</p><p dir='rtl'>مرحبا بالعالم</p><p>Emoji 😀 ✓ ★ © ® ™ € £</p><p>ﬁ ligature ﬂ</p>",
            "browser_links_tables": "<p><a href='https://example.com'>Portofolio</a> | <a href='mailto:a@b.c'>a@b.c</a></p>"
                                    "<table border=1><tr><th>Skill</th><th>Level</th></tr><tr><td>SQL</td><td>5</td></tr><tr><td>Python</td><td>4</td></tr></table>"
                                    "<h6>tiny heading</h6><p style='font-size:7px'>Small print 7px text here</p><p style='letter-spacing:3px'>S P A C E D</p>",
        }
        for name, body in pages.items():
            html = d / f"{name}.html"
            html.write_text(f"<html><head><meta charset='utf-8'></head><body style='font-family:Arial'>{body}</body></html>", encoding="utf-8")
            pdf = d / f"{name}.pdf"
            subprocess.run([edge, "--headless", "--disable-gpu", "--no-pdf-header-footer", f"--print-to-pdf={pdf}", html.as_uri()],
                           capture_output=True, timeout=60)
            if pdf.exists():
                out.append(pdf)
    (d / "garbage.pdf").write_bytes(b"%PDF-1.4\nthis is not a real pdf")
    out.append(d / "garbage.pdf")
    return out


# ---------------------------------------------------------------------------- scenarios

def run(h: Harness, db_dsn: str, pdfs: list[Path]):
    import psycopg2

    def email(be, who):
        return f"{who}-{be.ns}@x.{be.ns}.test"

    def store_token(be, name, resp):
        if isinstance(resp[1], dict) and "access_token" in resp[1]:
            be.tokens[name] = resp[1]["access_token"]
        return resp

    # --- misc / meta
    h.req("GET /", "GET", "/")
    h.req("GET /api/health", "GET", "/api/health")
    h.req("GET unknown route", "GET", "/api/nope")
    h.req("PUT on POST-only route", "PUT", "/api/auth/login")

    # --- auth
    for who, role in (("seeker", "JOBSEEKER"), ("company", "COMPANY"), ("admin", "ADMIN")):
        h.both(f"POST /auth/register {who}", lambda be, who=who, role=role: store_token(
            be, who, be.call("POST", "/api/auth/register", json={"name": f"Nama {who}", "email": email(be, who), "password": "rahasia-123", "role": role})))
    h.req("register duplicate -> 400", "POST", "/api/auth/register",
          json=lambda be: {"name": "x", "email": email(be, "seeker"), "password": "p"})
    h.req("register missing fields -> 422", "POST", "/api/auth/register", json={"name": "a"})
    h.req("register wrong types -> 422", "POST", "/api/auth/register", json={"name": 1, "email": None, "password": []})
    h.req("register no body -> 422", "POST", "/api/auth/register")
    h.req("register invalid JSON -> 422", "POST", "/api/auth/register", data=b"{bad", headers={"Content-Type": "application/json"})
    h.req("register non-object -> 422", "POST", "/api/auth/register", json=[1])
    h.both("POST /auth/login ok", lambda be: store_token(be, "seeker2", be.call("POST", "/api/auth/login", json={"email": email(be, "seeker"), "password": "rahasia-123"})))
    h.req("login wrong password", "POST", "/api/auth/login", json=lambda be: {"email": email(be, "seeker"), "password": "salah"})
    h.req("login unknown email", "POST", "/api/auth/login", json={"email": "nobody@x.test", "password": "x"})
    h.req("login missing field", "POST", "/api/auth/login", json={"email": "a"})

    # cross-compat: bcrypt hash + JWT made by one backend must work on the other
    py, rs = h.py, h.rs
    h.total += 1
    cross = []
    s, b = rs.call("POST", "/api/auth/login", json={"email": email(py, "seeker"), "password": "rahasia-123"})
    cross.append(("rust login with python bcrypt hash", s == 200))
    s, b = py.call("POST", "/api/auth/login", json={"email": email(rs, "seeker"), "password": "rahasia-123"})
    cross.append(("python login with rust bcrypt hash", s == 200))
    s, b = rs.call("GET", "/api/auth/me", token=py.tokens["seeker"])
    cross.append(("rust accepts python JWT", s == 200 and b.get("email") == email(py, "seeker")))
    s, b = py.call("GET", "/api/auth/me", token=rs.tokens["seeker"])
    cross.append(("python accepts rust JWT", s == 200 and b.get("email") == email(rs, "seeker")))
    for label, ok in cross:
        print(f"{'OK  ' if ok else 'DIFF'} cross-compat: {label}")
    if not all(ok for _, ok in cross):
        h.diffs.append(("cross-compat", cross, None))

    h.req("GET /auth/me", "GET", "/api/auth/me", token="seeker")
    h.req("me without token", "GET", "/api/auth/me")
    h.req("me bad token", "GET", "/api/auth/me", token="garbage")
    h.req("me wrong scheme", "GET", "/api/auth/me", headers={"Authorization": "Basic abc"})
    h.req("PUT /auth/profile", "PUT", "/api/auth/profile", token="seeker",
          json={"name": "Nama Baru", "phone": "0812", "bio": None, "target_role": "Data Analyst", "experience_level": "JUNIOR"})
    h.req("profile empty -> 400", "PUT", "/api/auth/profile", token="seeker", json={})
    h.req("profile wrong type -> 422", "PUT", "/api/auth/profile", token="seeker", json={"name": 5})
    h.req("profile no auth + bad body (auth wins)", "PUT", "/api/auth/profile", json={"name": 5})
    h.req("PUT /auth/password wrong old", "PUT", "/api/auth/password", token="seeker", json={"old_password": "x", "new_password": "y"})
    h.req("PUT /auth/password ok", "PUT", "/api/auth/password", token="seeker", json={"old_password": "rahasia-123", "new_password": "rahasia-456"})
    h.req("login with new password", "POST", "/api/auth/login", json=lambda be: {"email": email(be, "seeker"), "password": "rahasia-456"})
    h.req("password >72 bytes", "POST", "/api/auth/login", json=lambda be: {"email": email(be, "seeker"), "password": "x" * 80})
    h.req("forgot-password known", "POST", "/api/auth/forgot-password", json=lambda be: {"email": email(be, "seeker")})
    h.req("forgot-password unknown", "POST", "/api/auth/forgot-password", json={"email": "ghost@x.test"})

    def reset_token(be, **claims):
        import datetime as dt

        from jose import jwt as j
        uid = be.call("GET", "/api/auth/me", token="seeker")[1]["id"]
        base = {"sub": str(uid), "purpose": "reset_password", "exp": dt.datetime.now(dt.timezone.utc) + dt.timedelta(hours=1)}
        base.update(claims)
        return j.encode(base, SECRET, algorithm="HS256")

    h.req("reset-password bad token", "POST", "/api/auth/reset-password", json={"token": "nope", "new_password": "z"})
    h.req("reset-password wrong purpose", "POST", "/api/auth/reset-password",
          json=lambda be: {"token": reset_token(be, purpose="other"), "new_password": "z"})
    h.req("reset-password ok", "POST", "/api/auth/reset-password",
          json=lambda be: {"token": reset_token(be), "new_password": "rahasia-123"})
    h.req("login after reset", "POST", "/api/auth/login", json=lambda be: {"email": email(be, "seeker"), "password": "rahasia-123"})

    # --- oauth bridge
    h.req("oauth bad secret", "POST", "/api/auth/oauth", headers={"x-oauth-secret": "no"}, json={"email": "g@x.test"})
    h.req("oauth no email", "POST", "/api/auth/oauth", headers={"x-oauth-secret": OAUTH}, json={})
    h.req("oauth non-object body", "POST", "/api/auth/oauth", headers={"x-oauth-secret": OAUTH}, json=[1])
    h.both("oauth creates user", lambda be: store_token(be, "oauth", be.call(
        "POST", "/api/auth/oauth", headers={"x-oauth-secret": OAUTH}, json={"email": f"google-{be.ns}@x.{be.ns}.test", "name": ""})))
    h.req("oauth existing user", "POST", "/api/auth/oauth", headers={"x-oauth-secret": OAUTH},
          json=lambda be: {"email": f"google-{be.ns}@x.{be.ns}.test", "name": "Ignored"})

    # --- CV upload + analysis
    h.req("upload without auth", "POST", "/api/upload-cv")
    h.req("upload missing file -> 422", "POST", "/api/upload-cv", token="seeker")
    h.req("upload non-pdf -> 400", "POST", "/api/upload-cv", token="seeker", files={"file": ("cv.txt", b"hello", "text/plain")})
    cv_ids = {}
    for pdf in pdfs:
        def up(be, pdf=pdf):
            r = be.call("POST", "/api/upload-cv", token="seeker", files={"file": (pdf.name, pdf.read_bytes(), "application/pdf")})
            if r[0] == 200:
                cv_ids.setdefault(pdf.name, {})[be.ns] = r[1]["cv_id"]
            return r
        h.both(f"upload {pdf.name}", up)

    # PDF text comparison straight from the DB (the real risk: PyPDF2 vs Rust extraction)
    conn = psycopg2.connect(db_dsn)
    print("\n--- PDF text extraction: PyPDF2 vs Rust (cv_data.extracted_text) ---")
    for name, ids in cv_ids.items():
        with conn.cursor() as cur:
            cur.execute("select extracted_text from cv_data where id=%s", (ids["py"],))
            a = cur.fetchone()[0]
            cur.execute("select extracted_text from cv_data where id=%s", (ids["rs"],))
            b = cur.fetchone()[0]
        same = a == b
        print(f"{'IDENT' if same else 'DIFF '} {name}: len py={len(a)} rs={len(b)}")
        if not same:
            h.diffs.append((f"pdf text {name}", a[:400], b[:400]))
            print("   py:", repr(a[:200]))
            print("   rs:", repr(b[:200]))
    conn.close()
    print()

    first = next(iter(cv_ids), None)
    cv_of = lambda be: cv_ids[first][be.ns]  # noqa: E731
    h.cv_of = cv_of
    h.req("analyze unknown cv -> 404", "POST", "/api/analyze-gap", token="seeker", json={"cv_id": 99999999, "target_role": "Data Analyst"})
    h.req("analyze invalid body -> 422", "POST", "/api/analyze-gap", token="seeker", json={"cv_id": "abc", "target_role": 1})
    for role, level in (("Data Analyst", "MID"), ("Software Engineer", "senior"), ("Cybersecurity Analyst", "JUNIOR"), ("Custom Role", "MID")):
        def an(be, role=role, level=level):
            r = be.call("POST", "/api/analyze-gap", token="seeker", json={"cv_id": cv_of(be), "target_role": role, "level": level})
            if r[0] == 200:
                be.ids["analysis"] = r[1]["analysis_id"]
            return r
        h.both(f"analyze-gap {role}/{level} (fallback)", an)
    h.req("GET /recommendations/{id}", "GET", lambda be: f"/api/recommendations/{be.ids['analysis']}", token="seeker")
    h.req("recommendations not found", "GET", "/api/recommendations/99999999", token="seeker")
    h.req("recommendations bad id -> 422", "GET", "/api/recommendations/abc", token="seeker")
    h.req("recommendations bad id, no auth (auth wins)", "GET", "/api/recommendations/abc")
    h.req("GET /dashboard/overview", "GET", "/api/dashboard/overview", token="seeker")
    h.req("GET /dashboard/history", "GET", "/api/dashboard/history", token="seeker")
    h.req("dashboard overview (no data)", "GET", "/api/dashboard/overview", token="oauth")
    h.req("POST /contact", "POST", "/api/contact", json={"name": "A", "email": "a@x.test", "message": "hi"})
    h.req("contact missing -> 422", "POST", "/api/contact", json={"name": "A"})

    # --- role gates
    h.req("admin/overview as seeker -> 403", "GET", "/api/admin/overview", token="seeker")
    h.req("company/overview as seeker -> 403", "GET", "/api/company/overview", token="seeker")
    h.req("company/roles as seeker -> 403", "GET", "/api/company/roles", token="seeker")

    # --- company
    h.req("POST /company/roles", "POST", "/api/company/roles", token="company",
          json={"title": "  Data Analyst ", "level": "MID", "required_skills": " SQL, Python ,, Excel "})
    h.req("roles blank title -> 400", "POST", "/api/company/roles", token="company", json={"title": "   ", "required_skills": ""})
    h.req("roles missing -> 422", "POST", "/api/company/roles", token="company", json={})
    h.req("GET /company/roles", "GET", "/api/company/roles", token="company")
    h.both("DELETE /company/roles/{id}", lambda be: be.call(
        "DELETE", f"/api/company/roles/{be.call('GET', '/api/company/roles', token='company')[1][0]['id']}", token="company"))
    h.req("DELETE role not found", "DELETE", "/api/company/roles/99999999", token="company")
    h.req("DELETE role bad id -> 422", "DELETE", "/api/company/roles/x", token="company")

    def mk_invite(be, who_email=None, role="Data Analyst"):
        r = be.call("POST", "/api/company/invites", token="company",
                    json={"target_role": role, "level": "MID", **({"candidate_email": who_email} if who_email else {})})
        if r[0] == 200:
            be.ids.setdefault("invites", []).append(r[1]["token"])
        return r

    h.both("POST /company/invites (no email)", lambda be: mk_invite(be))
    h.both("POST /company/invites (with email)", lambda be: mk_invite(be, f"cand-{be.ns}@x.{be.ns}.test", "Software Engineer"))
    h.req("invites missing -> 422", "POST", "/api/company/invites", token="company", json={})
    h.req("GET /company/invites", "GET", "/api/company/invites", token="company")
    h.req("GET /invite/{token}", "GET", lambda be: f"/api/invite/{be.ids['invites'][0]}")
    h.req("GET /invite unknown -> 404", "GET", "/api/invite/doesnotexist")
    pdf0 = pdfs[0]
    h.req("submit invite missing fields -> 422", "POST", lambda be: f"/api/invite/{be.ids['invites'][0]}/submit")
    h.req("submit invite non-pdf -> 400", "POST", lambda be: f"/api/invite/{be.ids['invites'][0]}/submit",
          data={"name": "X"}, files={"file": ("a.txt", b"x", "text/plain")})
    h.req("submit invite unknown token -> 404", "POST", "/api/invite/nope/submit",
          data={"name": "X"}, files={"file": ("a.pdf", pdf0.read_bytes(), "application/pdf")})
    h.req("submit invite ok", "POST", lambda be: f"/api/invite/{be.ids['invites'][0]}/submit",
          data={"name": "  Kandidat Tamu "}, files={"file": ("cv.pdf", pdf0.read_bytes(), "application/pdf")})
    h.req("GET /invite after submit", "GET", lambda be: f"/api/invite/{be.ids['invites'][0]}")
    h.req("submit invite (email invite)", "POST", lambda be: f"/api/invite/{be.ids['invites'][1]}/submit",
          data={"name": ""}, files={"file": ("cv.pdf", pdf0.read_bytes(), "application/pdf")})
    h.req("GET /company/invites after", "GET", "/api/company/invites", token="company")

    # --- global (platform-wide) endpoints: py then rs back to back, no writes in between
    h.req("GET /admin/overview", "GET", "/api/admin/overview", token="admin", shared=True)
    h.req("GET /admin/users", "GET", "/api/admin/users", token="admin", shared=True)
    h.req("GET /company/overview", "GET", "/api/company/overview", token="company", shared=True)
    h.req("GET /company/talent", "GET", "/api/company/talent", token="company", shared=True)
    h.req("GET /company/overview as admin", "GET", "/api/company/overview", token="admin", shared=True)

    # --- CORS
    for label, method, hdrs in (
        ("CORS simple allowed origin", "GET", {"Origin": "http://localhost:3000"}),
        ("CORS simple unknown origin", "GET", {"Origin": "http://evil.test"}),
        ("CORS preflight", "OPTIONS", {"Origin": "http://localhost:3000", "Access-Control-Request-Method": "POST",
                                       "Access-Control-Request-Headers": "authorization,content-type"}),
    ):
        h.total += 1
        a = requests.request(method, f"{py.base}/api/health", headers=hdrs)
        b = requests.request(method, f"{rs.base}/api/health", headers=hdrs)
        keys = ["access-control-allow-origin", "access-control-allow-credentials", "access-control-allow-methods",
                "access-control-allow-headers", "access-control-max-age"]
        # "A, B" and "A,B" are the same header value list
        canon = lambda v: None if v is None else ",".join(x.strip() for x in v.split(","))  # noqa: E731
        ha = {k: canon(a.headers.get(k)) for k in keys}
        hb = {k: canon(b.headers.get(k)) for k in keys}
        ok = a.status_code == b.status_code and ha == hb
        print(f"{'OK  ' if ok else 'DIFF'} {label}: py={a.status_code} rs={b.status_code}")
        if not ok:
            h.diffs.append((label, (a.status_code, ha), (b.status_code, hb)))


# ---------------------------------------------------------------------------- Anthropic mock

class Mock(http.server.BaseHTTPRequestHandler):
    mode = "ok"
    calls = 0

    def log_message(self, *a):
        pass

    def do_POST(self):
        self.rfile.read(int(self.headers.get("content-length", 0)))
        Mock.calls += 1
        mode = Mock.mode
        if mode == "http400":
            return self._send(400, {"type": "error", "error": {"type": "invalid_request_error", "message": "nope"}})
        if mode == "empty_content":
            return self._send(200, {"id": "m", "type": "message", "role": "assistant", "content": [], "model": "x",
                                    "stop_reason": "end_turn", "usage": {"input_tokens": 1, "output_tokens": 1}})
        if mode == "bad_json_then_ok" and Mock.calls == 1:
            text = "Maaf, ini bukan JSON"
        elif mode == "bad_skill_value":
            text = json.dumps({"match_score": 50, "skills": [{"skill": "SQL", "current": "abc", "required": 70}]})
        elif mode == "not_object":
            text = "[1, 2, 3]"
        else:
            body = {
                "match_score": 123.456 if mode == "score_over_100" else 61.25,
                "skills": [
                    {"skill": "SQL", "current": "55.0".split(".")[0], "required": 120, "gap": 999, "priority": "BOGUS", "note": "extra"},
                    {"skill": "Python", "current": 40.9, "required": 75},
                    {"skill": "Docker", "current": -5, "required": 60, "gap": 0, "priority": "LOW"},
                    {"skill": "Kubernetes", "current": 70, "required": 72},
                    {"skill": "Café ☕", "required": 50},
                ],
                "missing_skills": ["ignored"],
                "recommended_courses": [f"Course {i}" for i in range(12)],
                "reference_standard": "model-made-up regulation",
            }
            text = json.dumps(body, ensure_ascii=False)
            if mode in ("ok", "bad_json_then_ok", "score_over_100"):
                text = "```json\n" + text + "\n```"
        self._send(200, {"id": "m", "type": "message", "role": "assistant", "model": "x", "stop_reason": "end_turn",
                         "content": [{"type": "text", "text": text}], "usage": {"input_tokens": 1, "output_tokens": 1}})

    def _send(self, code, obj):
        raw = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def run_ai(h: Harness, cv_of):
    print("\n--- Claude path (mock Anthropic server; retries use the real 1s/2s backoff) ---")
    for mode in ("ok", "score_over_100", "bad_json_then_ok", "bad_skill_value", "not_object", "empty_content", "http400"):
        def fn(be, mode=mode):
            Mock.mode, Mock.calls = mode, 0
            r = be.call("POST", "/api/analyze-gap", token="seeker",
                        json={"cv_id": cv_of(be), "target_role": "Software Engineer", "level": "MID"})
            r[1]["_mock_calls"] = Mock.calls if isinstance(r[1], dict) else None
            return r
        h.both(f"analyze-gap with Claude mock: {mode}", fn)
    # persisted skill_details must also be identical (the DB is shared by both backends)
    h.req("recommendations after AI analysis", "GET", lambda be: f"/api/recommendations/{be.ids['analysis']}", token="seeker")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--rust-bin", default=str(ROOT / "backend-rs" / "target" / "release" / "navikarier-backend"))
    ap.add_argument("--database-url", help="postgresql://... (a fresh database is created inside it)")
    ap.add_argument("--keep", action="store_true", help="leave the servers running at the end")
    args = ap.parse_args()
    rust_bin = args.rust_bin if Path(args.rust_bin).exists() else args.rust_bin + ".exe"

    if args.database_url:
        admin_url = args.database_url
    else:
        import pgserver
        pg = pgserver.get_server(tempfile.mkdtemp(prefix="navi-pg-"), cleanup_mode="stop")
        admin_url = pg.get_uri()
    import psycopg2
    admin = psycopg2.connect(admin_url.replace("postgresql+psycopg2://", "postgresql://"))
    admin.autocommit = True
    dbname = f"navi_compare_{int(time.time())}"
    admin.cursor().execute(f'create database "{dbname}"')
    # The postgres docker image runs in UTC. psycopg2 sends tz-aware datetimes, which Postgres converts
    # to the *session* TimeZone when storing into `timestamp`; Rust always writes UTC. Match prod:
    admin.cursor().execute(f"alter database \"{dbname}\" set timezone to 'UTC'")
    base = admin_url.rsplit("/", 1)[0]
    dsn = f"{base}/{dbname}".replace("postgresql+psycopg2://", "postgresql://")
    env_db = {"DATABASE_URL": sqlalchemy_url(dsn)}

    procs = []
    try:
        # Alembic (what `docker run backend` does first), then uvicorn creates job_roles/invites.
        subprocess.run([sys.executable, "-m", "alembic", "upgrade", "head"], cwd=BACKEND,
                       env={**os.environ, **ENV_COMMON, **env_db}, check=True)
        py_proc = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PY_PORT)], cwd=BACKEND,
                                   env={**os.environ, **ENV_COMMON, **env_db})
        procs.append(py_proc)
        wait_health(PY_PORT, py_proc, "python backend")
        rs_proc = subprocess.Popen([rust_bin], env={**os.environ, **ENV_COMMON, "DATABASE_URL": dsn,
                                                     "PORT": str(RS_PORT), "BIND": "127.0.0.1"})
        procs.append(rs_proc)
        wait_health(RS_PORT, rs_proc, "rust backend")

        with tempfile.TemporaryDirectory() as d:
            pdfs = make_pdfs(Path(d))
            h = Harness(Backend("py", PY_PORT), Backend("rs", RS_PORT))
            run(h, dsn, pdfs)

            # Phase 2: same DB and tokens, but both backends now have ANTHROPIC_API_KEY set and
            # ANTHROPIC_BASE_URL pointing at the mock.
            for p in procs[:]:
                p.terminate()
            ai_env = {"ANTHROPIC_API_KEY": "sk-ant-test", "ANTHROPIC_BASE_URL": f"http://127.0.0.1:{MOCK_PORT}"}
            srv = http.server.ThreadingHTTPServer(("127.0.0.1", MOCK_PORT), Mock)
            threading.Thread(target=srv.serve_forever, daemon=True).start()
            py2 = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--port", str(PY_AI_PORT)], cwd=BACKEND,
                                   env={**os.environ, **ENV_COMMON, **env_db, **ai_env})
            rs2 = subprocess.Popen([rust_bin], env={**os.environ, **ENV_COMMON, **ai_env, "DATABASE_URL": dsn,
                                                     "PORT": str(RS_AI_PORT), "BIND": "127.0.0.1"})
            procs.extend([py2, rs2])
            wait_health(PY_AI_PORT, py2, "python backend (AI)")
            wait_health(RS_AI_PORT, rs2, "rust backend (AI)")
            h.py.base, h.rs.base = f"http://127.0.0.1:{PY_AI_PORT}", f"http://127.0.0.1:{RS_AI_PORT}"
            run_ai(h, h.cv_of)
            srv.shutdown()

        print(f"\n{h.total - len(h.diffs)}/{h.total} checks identical")
        for label, a, b in h.diffs:
            print(f"\n--- DIFF: {label}\n  python: {json.dumps(a, ensure_ascii=False)[:1500]}\n  rust:   {json.dumps(b, ensure_ascii=False)[:1500]}")
        sys.exit(1 if h.diffs else 0)
    finally:
        if not args.keep:
            for p in procs:
                p.terminate()
        admin.close()


if __name__ == "__main__":
    main()
