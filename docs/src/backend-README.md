# NaviKarier Backend

> FastAPI server untuk NaviKarier, skill gap analyzer.

<p align="center"><a href="../README.md">Beranda repo</a> · <a href="../backend-rs/README.md">Port Rust</a></p>

## Stack

- **FastAPI** sebagai web framework.
- **SQLAlchemy** sebagai ORM, **Alembic** untuk migrasi.
- **Pydantic** untuk validasi.
- **PyPDF2** untuk membaca teks CV, **Anthropic API** untuk analisis.
- **SQLite** (dev) dan **PostgreSQL** (produksi).

## Struktur

```
backend/
├── app/
│   ├── main.py         entrypoint FastAPI (mount /api)
│   ├── database.py     engine SQLAlchemy dan Base
│   ├── models.py       model ORM
│   ├── schemas.py      skema Pydantic
│   ├── auth.py         utilitas JWT
│   ├── ai_service.py   integrasi AI
│   ├── services.py     logika bisnis dan analisis fallback
│   └── api/            router dan controller
├── alembic/            migrasi database
├── requirements.txt
└── .env.example
```

## Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Windows: copy .env.example .env
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Dokumentasi API interaktif ada di `http://localhost:8000/docs`.

## API

- `GET /api/health` memeriksa API dan koneksi database.
- `/api/auth/*` mencakup register, login, profil, password, lupa password, dan OAuth.
- `/api/upload-cv`, `/api/analyze-gap`, `/api/recommendations/{id}` untuk alur analisis.
- `/api/dashboard/*`, `/api/admin/*`, `/api/company/*`, `/api/invite/*` untuk dashboard, admin, dan perusahaan.

Daftar lengkap ada di `app/api/routes.py`.

## Produksi

Image dibangun dari `Dockerfile` ini. Saat start, container menjalankan `alembic upgrade head` lalu `uvicorn` di port 8000. Konfigurasi produksi ada di `../deploy/`.
