# backend-rs

> Port Rust dari backend NaviKarier. Pengganti drop-in untuk `backend/` (FastAPI).

<p align="center"><a href="../README.md">Beranda repo</a> · <a href="../backend/README.md">Backend Python</a></p>


Drop-in replacement for `backend/` (FastAPI): same `/api/*` routes, JSON shapes, status codes
and Postgres schema. Alembic remains the schema owner; this crate never migrates or creates tables.

> **Status:** compiles, 6/6 unit tests pass, and `tests/compare/compare.py` reports **110/110
> checks identical** against the Python backend on one Postgres (all 27 endpoints, error
> bodies, JSON key order, bcrypt/JWT cross-compat in both directions, the Claude path with retries
> against a mock, and 11 PDFs whose extracted text matches PyPDF2 byte for byte). The Docker image
> has **not** been built (no Docker on the dev machine), and nothing ran against production data.

## Endpoints (27, plus FastAPI's built-in `/docs`, `/redoc`, `/openapi.json` which are not ported)

| # | Method + path | Auth |
|---|---|---|
| 1 | `GET /` | - |
| 2 | `GET /api/health` | - |
| 3 | `POST /api/auth/register` | - |
| 4 | `POST /api/auth/login` | - |
| 5 | `GET /api/auth/me` | Bearer |
| 6 | `PUT /api/auth/profile` | Bearer |
| 7 | `PUT /api/auth/password` | Bearer |
| 8 | `POST /api/auth/forgot-password` | - |
| 9 | `POST /api/auth/reset-password` | reset token |
| 10 | `POST /api/auth/oauth` | `X-OAuth-Secret` |
| 11 | `POST /api/upload-cv` (multipart `file`) | Bearer |
| 12 | `POST /api/analyze-gap` | Bearer |
| 13 | `GET /api/recommendations/{analysis_id}` | Bearer |
| 14 | `GET /api/dashboard/overview` | Bearer |
| 15 | `GET /api/dashboard/history` | Bearer |
| 16 | `POST /api/contact` | - |
| 17 | `GET /api/admin/overview` | ADMIN |
| 18 | `GET /api/admin/users` | ADMIN |
| 19 | `GET /api/company/overview` | COMPANY/ADMIN |
| 20 | `GET /api/company/talent` | COMPANY/ADMIN |
| 21 | `POST /api/company/roles` | COMPANY/ADMIN |
| 22 | `GET /api/company/roles` | COMPANY/ADMIN |
| 23 | `DELETE /api/company/roles/{role_id}` | COMPANY/ADMIN |
| 24 | `POST /api/company/invites` | COMPANY/ADMIN |
| 25 | `GET /api/company/invites` | COMPANY/ADMIN |
| 26 | `GET /api/invite/{token}` | token |
| 27 | `POST /api/invite/{token}/submit` (multipart `name`, `file`) | token |

## Run

Env (same names/defaults as the Python backend): `DATABASE_URL` (Postgres only; a
`postgresql+psycopg2://` suffix is tolerated), `JWT_SECRET`, `OAUTH_BRIDGE_SECRET`,
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `FROM_EMAIL`, `CONTACT_EMAIL`, `FRONTEND_URL`,
`CORS_ORIGINS` (comma separated, not trimmed), plus `PORT` (default 8000) and `BIND`.
Without `ANTHROPIC_API_KEY` the rule-based fallback runs, byte-for-byte like `services.py`.

The Alembic migration only creates `users`, `cv_data`, `analysis_results`; `job_roles` and
`invites` are created by `Base.metadata.create_all` when the Python app boots. A database that
has never been served by the Python backend therefore lacks those two tables.

## Verify

```powershell
cargo test                       # unit tests: bcrypt ($2b$ from Python), JWT, json.dumps, isoformat, fallback maths
cargo build --release
python backend-rs/tests/compare/compare.py   # Python vs Rust on one Postgres, every endpoint
```

On a Windows box without MSVC/MinGW use zig as the C toolchain: `pip install ziglang cargo-zigbuild`,
put a `dlltool.exe` shim that runs `zig dlltool` on `PATH` (windows-gnu needs one for raw-dylib), then
`cargo zigbuild`. Gotchas hit while doing that: sqlx's `chrono` feature produced binaries that
segfault before `main` with that linker (hence the `time` crate here), and the embedded Postgres from
`pgserver` ships without tz data, so sqlx's `SET TimeZone='UTC'` fails until a `share/postgresql/timezone`
directory (e.g. from the `tzdata` wheel) is added. Neither affects Linux/Docker builds.

### Test environment notes
- The harness sets the test database to `timezone = 'UTC'`, like the `postgres` Docker image.
  Python stores tz-aware datetimes into `timestamp` columns through the *session* TimeZone, Rust
  always writes UTC; if production Postgres runs in another TimeZone the two would disagree.
- `compare.py` points both backends at a mock Anthropic server through `ANTHROPIC_BASE_URL`
  (honoured by the Python SDK and by this crate).

`compare.py` masks ids/tokens/timestamps, compares status, JSON body *and key order*, cross-checks
bcrypt hashes and JWTs in both directions, and compares `cv_data.extracted_text` (PyPDF2 vs the Rust
extractor) for a generated PDF corpus.

## PDF extraction

`src/pdf.rs` ports PyPDF2 3.0.1 `extract_text` (operator state machine, `_cmap.py` font/encoding
rules, newline/space heuristics). Encoding tables are dumped from PyPDF2 into
`data/pypdf2_tables.json` by `data/gen_data.py`; `lopdf` only parses objects/streams. It matters
because the fallback score depends on `len(text)`.

Measured against PyPDF2 (extracted text compared char for char): reportlab Helvetica / Times (3 pages) /
Courier two-column / Arial and Calibri TrueType subsets with accents and ligatures / `Tw`+leading
spacing, and Edge "print to PDF" (Skia, Type0 Identity-H) for a simple CV, a two-column flex layout,
a 3-page justified document, CJK/RTL/emoji, and tables/links/tiny/letter-spaced text:
**11 of 11 identical**. Corrupt input fails the same way (HTTP 500) in both. Not covered: real CVs
from Word/LibreOffice/Canva, scanned (image-only) PDFs, encrypted or malformed-xref files.

## Known differences / not ported

- FastAPI built-ins (`/docs`, `/redoc`, `/openapi.json`) and trailing-slash redirects.
- 422 `json_invalid` position/message are approximations of Python's `json` module.
- Encrypted PDFs (PyPDF2 tries the empty password), CJK predefined CMaps (`gbk`/`gb2312`),
  lone UTF-16 surrogates; `lopdf` reads reals as `f32`.
- Anthropic SDK's own internal retries (the 3-attempt outer loop with 1s/2s backoff is ported).
- Float JSON formatting in exponent ranges (`1e-5` vs `1e-05`).
