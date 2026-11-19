# NaviKarier Backend

> API NaviKarier dalam Rust (Axum + sqlx). Satu binary statis, tanpa runtime Python.

<p align="center"><a href="../README.md">Beranda repo</a> · <a href="../frontend/README.md">Frontend</a></p>

## Stack

- **Axum 0.8** dan **Tokio** untuk server HTTP.
- **sqlx** untuk PostgreSQL. Skema dibuat otomatis saat start dari `src/schema.sql` (idempoten).
- **jsonwebtoken** dan **bcrypt** untuk autentikasi.
- **lopdf** dengan porting `extract_text` PyPDF2 di `src/pdf.rs` untuk membaca teks CV.
- **reqwest** (rustls) untuk Anthropic API dan Resend.
- Image Docker akhir berbasis `scratch`: hanya satu binary, berjalan sebagai user non-root.

## Struktur

```
backend/
├── src/
│   ├── main.rs        entrypoint, koneksi DB, skema saat start
│   ├── lib.rs         konfigurasi dan router
│   ├── handlers.rs    seluruh endpoint
│   ├── auth.rs        JWT dan bcrypt
│   ├── analysis.rs    analisis gap, fallback rule-based, panggilan Anthropic
│   ├── pdf.rs         ekstraksi teks PDF
│   ├── email.rs       pengiriman email (Resend)
│   ├── validate.rs    validasi request
│   ├── db.rs          tipe baris tabel
│   └── schema.sql     DDL tabel
├── data/              tabel statis (peta kursus, encoding PDF)
├── Dockerfile
└── Cargo.toml
```

## Endpoint

| # | Method dan path | Auth |
|---|---|---|
| 1 | `GET /` | - |
| 2 | `GET /api/health` | - |
| 3 | `POST /api/auth/register` | - |
| 4 | `POST /api/auth/login` | - |
| 5 | `GET /api/auth/me` | Bearer |
| 6 | `PUT /api/auth/profile` | Bearer |
| 7 | `PUT /api/auth/password` | Bearer |
| 8 | `POST /api/auth/forgot-password` | - |
| 9 | `POST /api/auth/reset-password` | token reset |
| 10 | `POST /api/auth/oauth` | `X-OAuth-Secret` |
| 11 | `POST /api/upload-cv` | Bearer |
| 12 | `POST /api/analyze-gap` | Bearer |
| 13 | `GET /api/recommendations/{analysis_id}` | Bearer |
| 14 | `GET /api/dashboard/overview` | Bearer |
| 15 | `GET /api/dashboard/history` | Bearer |
| 16 | `POST /api/contact` | - |
| 17 | `GET /api/admin/overview` | ADMIN |
| 18 | `GET /api/admin/users` | ADMIN |
| 19 | `GET /api/company/overview` | COMPANY atau ADMIN |
| 20 | `GET /api/company/talent` | COMPANY atau ADMIN |
| 21 | `POST /api/company/roles` | COMPANY atau ADMIN |
| 22 | `GET /api/company/roles` | COMPANY atau ADMIN |
| 23 | `DELETE /api/company/roles/{role_id}` | COMPANY atau ADMIN |
| 24 | `POST /api/company/invites` | COMPANY atau ADMIN |
| 25 | `GET /api/company/invites` | COMPANY atau ADMIN |
| 26 | `GET /api/invite/{token}` | token |
| 27 | `POST /api/invite/{token}/submit` | token |

## Menjalankan

```bash
cd backend
export DATABASE_URL=postgres://navi:navi_dev@localhost:5432/navikarier
export JWT_SECRET=ganti-ini
cargo run --release
```

| Variabel | Fungsi |
|---|---|
| `DATABASE_URL` | URL PostgreSQL (wajib) |
| `JWT_SECRET`, `OAUTH_BRIDGE_SECRET` | rahasia token dan jembatan login Google |
| `ANTHROPIC_API_KEY` | kosong berarti analisis fallback rule-based |
| `RESEND_API_KEY`, `FROM_EMAIL`, `CONTACT_EMAIL` | email, kosong berarti hanya di-log |
| `FRONTEND_URL`, `CORS_ORIGINS` | asal frontend (CORS dipisah koma) |
| `PORT`, `BIND` | bawaan 8000 dan 0.0.0.0 |

## Uji dan build

```bash
cargo test
cargo build --release
docker build -t navikarier-backend .
```

## Catatan

- Backend ini menggantikan versi Python (FastAPI). Bentuk respons, urutan kunci JSON, dan pesan error dipertahankan sama supaya frontend tidak berubah. Kode Python terakhir ada di tag git `python-backend-final`.
- Ekstraksi PDF mengikuti PyPDF2 3.0.1 karena skor fallback bergantung pada panjang teks. Belum teruji untuk PDF hasil scan, terenkripsi, atau xref rusak.
- Zona waktu Postgres sebaiknya UTC: Rust selalu menulis UTC ke kolom `timestamp`.
- Tidak di-port: `/docs`, `/redoc`, `/openapi.json` bawaan FastAPI.
