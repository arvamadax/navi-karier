# NaviKarier Frontend

> Next.js 14 (App Router) dan TypeScript untuk antarmuka NaviKarier.

<p align="center"><a href="../README.md">Beranda repo</a> · <a href="../backend/README.md">Backend</a></p>

## Stack

- **Next.js 14** App Router, **React 18**, **TypeScript 5**.
- CSS biasa dengan design token (lihat `app/globals.css`).
- **NextAuth.js v5** untuk login email dan Google.
- Font Inter dan JetBrains Mono.

## Struktur

```
frontend/
├── app/
│   ├── (landing)/      landing, blog, FAQ, harga
│   ├── (auth)/         login, daftar, lupa password
│   ├── (dashboard)/    dashboard, analisis, gap, roadmap, pengaturan
│   ├── components/     komponen bersama
│   └── lib/            klien API, konfigurasi auth, actions
├── public/assets/      logo dan foto tim
├── next.config.mjs     output standalone dan rewrite /api/*
├── Dockerfile.prod     image produksi multi-stage
└── .env.local.example
```

## Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local   # Windows: copy .env.local.example .env.local
npm run dev
```

Buka `http://localhost:3000`. Backend harus berjalan lebih dulu (lihat README backend).

## Integrasi backend

`next.config.mjs` meneruskan `/api/*` ke `NEXT_PUBLIC_API_BASE_URL` (bawaan `http://localhost:8000`). Variabel ini ikut tertanam saat build, jadi image produksi dibangun dengan URL API publik.

## Skrip

| Skrip | Fungsi |
|---|---|
| `npm run dev` | Dev server di port 3000 |
| `npm run build` | Build produksi (output standalone) |
| `npm run start` | Menjalankan hasil build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Image produksi

`Dockerfile.prod` membangun lalu hanya menyalin `.next/standalone`, aset statis, dan `public`. Hasilnya sekitar 230 MB dan berjalan sebagai user non-root.
