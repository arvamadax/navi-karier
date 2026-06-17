# NaviKarier

> Dari tebakan jadi data. Platform diagnostik karier berbasis AI untuk job seekers Indonesia.

**Digdaya x Hackathon 2026** — Bank Indonesia x OJK
Problem Statement: Digitalisasi Penciptaan Lapangan Kerja

---

## Apa itu NaviKarier?

NaviKarier adalah platform **Skill Gap Advisor** yang membantu pencari kerja Indonesia mengetahui secara presisi kompetensi apa yang kurang untuk posisi yang mereka inginkan — dan langkah konkret untuk menutupnya.

### Alur Kerja

1. **Upload CV** (PDF) + tentukan posisi target & level pengalaman
2. **AI menganalisis** dan membandingkan profil dengan standar kompetensi industri
3. Dapatkan **Match Score**, **Skill Gap Detail**, dan **Learning Roadmap** yang spesifik

NaviKarier membaca konteks pengalaman secara semantik menggunakan LLM — bukan sekadar keyword matching.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js 14 App Router, TypeScript, React 18 |
| Backend | Python 3, FastAPI, SQLAlchemy, Pydantic |
| AI Engine | Anthropic Claude API |
| Auth | NextAuth.js v5 (Credentials + Google OAuth) |
| CV Parsing | PyPDF2 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Migrations | Alembic |

---

## Struktur Repo

```
navi-karier/
├── backend/          # FastAPI API server
│   ├── app/
│   │   ├── main.py           # App entry point
│   │   ├── ai_service.py     # AI integration
│   │   ├── services.py       # Business logic + fallback analysis
│   │   ├── models.py         # SQLAlchemy models
│   │   ├── schemas.py        # Pydantic schemas
│   │   ├── database.py       # DB connection (SQLite/PostgreSQL)
│   │   ├── auth.py           # JWT auth utilities
│   │   └── api/
│   │       ├── routes.py     # API endpoints
│   │       └── controllers.py
│   ├── alembic/              # Database migrations
│   └── requirements.txt
│
└── frontend/         # Next.js 14 web app
    ├── app/
    │   ├── (landing)/        # Landing page, blog, FAQ, pricing
    │   ├── (auth)/           # Login, register, forgot password
    │   ├── (dashboard)/      # Dashboard, analyze, gap, roadmap, settings
    │   └── lib/              # API client, auth config, actions
    └── public/assets/        # Logos, team photos
```

---

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux
pip install -r requirements.txt
cp .env.example .env         # isi ANTHROPIC_API_KEY (opsional)
python -m alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API docs: `http://localhost:8000/docs`

> Jika `ANTHROPIC_API_KEY` tidak diisi, analisis menggunakan rule-based fallback (3 role default).

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # isi NEXT_PUBLIC_API_BASE_URL
npm run dev
```

App: `http://localhost:3000`

---

## Fitur

- **CV Upload & AI Analysis** — Upload PDF, pilih target role (15+ preset atau custom), dapatkan analisis gap
- **Skill Gap Detail** — Visualisasi skill gap dengan priority level (HIGH/MEDIUM/LOW)
- **Learning Roadmap** — Rekomendasi course dan timeline belajar berdasarkan gap
- **Dashboard** — Overview match score, riwayat analisis, top gaps
- **Profile & Settings** — Update profil, target role, experience level, ubah password
- **Auth** — Register, login, protected routes dengan JWT

---

## Environment Variables

### Backend (`backend/.env`)

```env
DATABASE_URL=sqlite:///./navikarier.db
CORS_ORIGINS=http://localhost:3000
ANTHROPIC_API_KEY=           # Opsional — kosongkan untuk fallback mode
APP_ENV=development
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000
```

---

## Tim

**Brawijaya 303** — Universitas Brawijaya

| Nama | Peran |
|---|---|
| Arva Mada Jayastu | Project Lead, Frontend Developer |
| Farrel Arzaqia Mecca | Backend Developer, AI Integration |
| Fairuz Zata Amani | Business Analyst, Documentation |

---

## License

2026 NaviKarier — Dibuat untuk Digdaya x Hackathon 2026.
