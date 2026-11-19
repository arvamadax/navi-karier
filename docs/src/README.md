# NaviKarier

> Dari tebakan jadi data. Platform diagnostik karier berbasis AI untuk pencari kerja Indonesia.

<p align="center"><a href="https://navikarier.mkxapp.tech">Buka aplikasi</a> · <a href="backend/README.md">Backend</a> · <a href="frontend/README.md">Frontend</a> · <a href="deploy/MIGRATION.md">Deploy</a></p>

## Apa itu NaviKarier

NaviKarier adalah **Skill Gap Advisor**: ia memberi tahu pencari kerja kompetensi apa yang masih kurang untuk posisi yang diincar, dan langkah konkret untuk menutupnya. Dibuat untuk **Digdaya x Hackathon 2026** (Bank Indonesia x OJK), tema Digitalisasi Penciptaan Lapangan Kerja.

1. **Unggah CV** (PDF), lalu tentukan posisi target dan level pengalaman.
2. **Analisis AI** membandingkan profil dengan standar kompetensi industri, membaca konteks pengalaman secara semantik, bukan sekadar mencocokkan kata kunci.
3. Dapatkan **Match Score**, **Skill Gap** terperinci, dan **Learning Roadmap** yang spesifik.

## Fitur

- **CV Upload dan analisis AI**: PDF, 15+ role preset atau role kustom.
- **Skill Gap Detail**: prioritas HIGH, MEDIUM, LOW per skill.
- **Learning Roadmap**: rekomendasi kursus dan linimasa belajar berdasarkan gap.
- **Dashboard**: ringkasan match score, riwayat analisis, gap teratas.
- **Profil dan pengaturan**: target role, level, ubah password.
- **Autentikasi**: email dan password atau Google, rute terproteksi JWT.
- **Mode perusahaan dan admin**: talent pool, role, undangan kandidat, ringkasan pengguna.

## Tech stack

| Lapisan | Teknologi |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, React 18 |
| Backend | Python 3.11, FastAPI, SQLAlchemy, Pydantic |
| Backend alternatif | Rust, Axum, sqlx (`backend-rs/`, lihat README-nya) |
| AI | Anthropic API, dengan fallback rule-based |
| Auth | NextAuth.js v5 (Credentials dan Google OAuth) |
| Parsing CV | PyPDF2 |
| Database | SQLite (dev), PostgreSQL 17 (produksi) |
| Migrasi | Alembic |
| Infrastruktur | Docker Compose, Cloudflare Tunnel, GitHub Actions |

## Struktur repo

```
navi-karier/
├── backend/        FastAPI: API, model, layanan AI, migrasi Alembic
├── backend-rs/     Port Rust dari backend (setara, belum dipakai produksi)
├── frontend/       Next.js: landing, auth, dashboard
├── deploy/         Compose produksi, backup, auto-deploy, runbook
├── brand/          Logo dan font untuk README
└── docs/           Sumber README dan renderer
```

## Menjalankan lokal

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

```bash
# frontend
cd frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Backend di `http://localhost:8000` (dokumentasi API di `/docs`), frontend di `http://localhost:3000`. Tanpa `ANTHROPIC_API_KEY`, analisis memakai fallback rule-based.

## Variabel lingkungan

| Berkas | Variabel |
|---|---|
| `backend/.env` | `DATABASE_URL`, `CORS_ORIGINS`, `ANTHROPIC_API_KEY` (opsional), `JWT_SECRET`, `APP_ENV` |
| `frontend/.env.local` | `NEXT_PUBLIC_API_BASE_URL`, `AUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| `deploy/.env` | lihat `deploy/.env.example` (hanya di server, tidak pernah di-commit) |

## Deploy dan CI/CD

Produksi berjalan di home-server dengan Docker Compose, diekspos lewat Cloudflare Tunnel: frontend di `navikarier.mkxapp.tech`, API di `api-navikarier.mkxapp.tech`.

- **CI**: setiap push dan PR ke `main` menjalankan lint, build frontend, import check backend, serta validasi dan build image Docker.
- **CD**: server menarik `main` tiap 2 menit. Jika CI commit itu hijau, ia build ulang, cek health, dan rollback otomatis bila gagal.
- **Backup**: dump Postgres harian, simpan 14 hari.

Langkah lengkap ada di `deploy/MIGRATION.md`.

## Tim

**Brawijaya 303**, Universitas Brawijaya.

| Nama | Peran |
|---|---|
| Arva Mada Jayastu | Project Lead, Frontend Developer |
| Farrel Arzaqia Mecca | Backend Developer, AI Integration |
| Fairuz Zata Amani | Business Analyst, Documentation |

## Lisensi

2026 NaviKarier. Dibuat untuk Digdaya x Hackathon 2026.
