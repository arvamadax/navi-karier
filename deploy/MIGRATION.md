# Migrasi NaviKarier → home-server

Target: semua jalan di `arva-home-server` (Docker + tunnel Cloudflare yang sudah ada).
Sumber lama: layanan hosting online (frontend dan backend) dengan Postgres di Supabase. Setelah migrasi tidak ada lagi ketergantungan ke layanan tersebut.

| Hostname | Ke | Port lokal |
|---|---|---|
| `navikarier.mkxapp.tech` | frontend | 127.0.0.1:8190 |
| `api-navikarier.mkxapp.tech` | backend | 127.0.0.1:8191 |

## 1. Siapkan server

```bash
ssh home-server-cf
git clone https://github.com/arvamadax/navi-karier ~/navi-karier
cd ~/navi-karier/deploy && cp .env.example .env && chmod 600 .env
nano .env     # semua secret baru dan acak (openssl rand -hex 32); user cukup login ulang
```

## 2. Tunnel + DNS

Prasyarat: zona `mkxapp.tech` sudah aktif di Cloudflare (nameserver dipindah dari `dns.host`).
Di dashboard Cloudflare → DNS, buat dua CNAME (Proxied) ke `8c8682b9-79e8-417f-b4ad-60c6590edaa2.cfargotunnel.com`:
`navikarier` dan `api-navikarier`. (`cert.pem` di server terikat ke zona `codewithus.me`, jadi `cloudflared tunnel route dns` tidak dipakai di sini.)

```bash
sudo nano /etc/cloudflared/config.yml
```

Tambah dua ingress ini SEBELUM baris `- service: http_status:404`:

```yaml
  - hostname: navikarier.mkxapp.tech
    service: http://127.0.0.1:8190
  - hostname: api-navikarier.mkxapp.tech
    service: http://127.0.0.1:8191
```

```bash
sudo systemctl restart cloudflared
```

## 3. Pindahkan DB

Jalankan dari `~/navi-karier/deploy`. Untuk dump FINAL, hentikan backend lama dulu supaya tidak ada tulisan baru. Backend Rust membuat skema sendiri saat start, jadi cukup salin DATA ke tabel yang sudah ada.

```bash
docker compose -f docker-compose.prod.yml up -d db
read -rs OLD_URL        # tempel DATABASE_URL lama, Enter (tidak tampil)
# Supabase: pakai koneksi langsung (5432) atau session pooler, BUKAN transaction pooler (6543); tambah ?sslmode=require
docker run --rm postgres:17-alpine pg_dump "$OLD_URL" --data-only --no-owner --no-acl \n  -t users -t cv_data -t analysis_results -t job_roles -t invites \
  | docker compose -f docker-compose.prod.yml exec -T db psql -U navi -d navikarier -v ON_ERROR_STOP=1
```

Cocokkan jumlah baris lama vs baru:

```bash
Q="select (select count(*) from users) users, (select count(*) from cv_data) cv, (select count(*) from analysis_results) analyses"
docker run --rm postgres:17-alpine psql "$OLD_URL" -c "$Q"
docker compose -f docker-compose.prod.yml exec -T db psql -U navi -d navikarier -c "$Q"
unset OLD_URL
```

Jika `pg_dump` menolak karena versi server lama lebih baru dari 17, ganti image dump ke versi yang sama dengan server lama.

## 4. Nyalakan app

```bash
docker compose -f docker-compose.prod.yml --env-file .env up -d --build
curl -s http://127.0.0.1:8191/api/health      # {"status":"ok","database":"ok",...}
curl -sI https://navikarier.mkxapp.tech | head -1
```

## 5. Layanan eksternal

- **Google OAuth** (Cloud Console → Credentials): tambah Authorized redirect URI `https://navikarier.mkxapp.tech/api/auth/callback/google` dan origin `https://navikarier.mkxapp.tech`.
- **Resend**: domain pengirim di `FROM_EMAIL` harus masih terverifikasi; kalau tidak, email gagal terkirim.
- Uji: daftar, login password, login Google, upload CV + analisis, lupa password.

## 6. Backup

```bash
chmod +x backup.sh && ./backup.sh && ls -lh backups
(crontab -l 2>/dev/null; echo "15 3 * * * $HOME/navi-karier/deploy/backup.sh >> $HOME/navi-karier/deploy/backups/cron.log 2>&1") | crontab -
```

Backup masih satu disk dengan DB. Salin `backups/` ke tempat lain secara berkala.

## 7. CI/CD otomatis

- **CI**: `.github/workflows/ci.yml` jalan di setiap push/PR ke `main` (lint + build frontend, tes + build backend Rust, validasi dan build image Docker).
- **CD**: `auto-deploy.sh` jalan dari cron di server tiap 2 menit. Jika `origin/main` berubah dan semua check CI commit itu hijau, ia `git merge --ff-only`, `docker compose up -d --build`, lalu cek health. Gagal health check → rollback ke commit sebelumnya. Tidak ada port masuk atau secret di GitHub.

```bash
chmod +x auto-deploy.sh
(crontab -l 2>/dev/null; echo "*/2 * * * * $HOME/navi-karier/deploy/auto-deploy.sh >> $HOME/navikarier-deploy.log 2>&1") | crontab -
tail -f ~/navikarier-deploy.log
```

Alur kerja: merge PR ke `main` → CI hijau → ±2–5 menit kemudian live. `deploy/.env` hanya ada di server dan tidak pernah di-commit.

## 8. Domain presentasi (terpisah dari app)

Deck presentasi (`presentasi/`, HTML + CSS statis) jalan sebagai service `presentasi` di compose yang sama, hostname sendiri, tanpa menyentuh app utama.

| Hostname | Ke | Port lokal |
|---|---|---|
| `presentasi-navikarier.mkxapp.tech` | presentasi | 127.0.0.1:8192 |

Sama seperti langkah 2: di Cloudflare DNS buat CNAME (Proxied) `presentasi-navikarier` ke `8c8682b9-79e8-417f-b4ad-60c6590edaa2.cfargotunnel.com`, lalu tambah ingress ini SEBELUM `- service: http_status:404` di `/etc/cloudflared/config.yml`:

```yaml
  - hostname: presentasi-navikarier.mkxapp.tech
    service: http://127.0.0.1:8192
```

```bash
sudo systemctl restart cloudflared
curl -sI https://presentasi-navikarier.mkxapp.tech | head -1
```

Setelah service ini ada di `origin/main`, `auto-deploy.sh` ikut menyalakannya lewat `compose up -d --build`. Pintasan keyboard: panah pindah slide, `N` catatan presenter, `F` layar penuh, `L` ganti tema.

## 9. Penutupan

Setelah semuanya lolos uji, matikan layanan hosting lama dan biarkan DB lama dalam keadaan pause 1–2 minggu sebelum dihapus.
