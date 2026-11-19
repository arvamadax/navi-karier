# Migrasi NaviKarier → home-server

Target: semua jalan di `arva-home-server` (Docker + tunnel Cloudflare yang sudah ada).
Sumber lama: Vercel (frontend), Render (backend), Postgres di Render/Supabase.

| Hostname | Ke | Port lokal |
|---|---|---|
| `navikarier.mkxapp.tech` | frontend | 127.0.0.1:8190 |
| `api-navikarier.mkxapp.tech` | backend | 127.0.0.1:8191 |

## 1. Siapkan server

```bash
ssh home-server-cf
git clone https://github.com/arvamadax/navi-karier ~/navi-karier
cd ~/navi-karier && git switch chore/homeserver-deploy   # sampai di-merge ke main
cd deploy && cp .env.example .env && chmod 600 .env
nano .env     # isi secret LAMA dari Render/Vercel; POSTGRES_PASSWORD baru
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

Jalankan dari `~/navi-karier/deploy`. Untuk dump FINAL, pause service backend di Render dulu supaya tidak ada tulisan baru.

```bash
docker compose -f docker-compose.prod.yml up -d db
read -rs OLD_URL        # tempel DATABASE_URL lama, Enter (tidak tampil)
# Supabase: pakai koneksi langsung (5432) atau session pooler, BUKAN transaction pooler (6543); tambah ?sslmode=require
docker run --rm postgres:17-alpine pg_dump "$OLD_URL" --no-owner --no-acl --schema=public \
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

## 7. Penutupan

Setelah semuanya lolos uji, biarkan Vercel/Render/DB lama dalam keadaan pause 1–2 minggu sebelum dihapus.
