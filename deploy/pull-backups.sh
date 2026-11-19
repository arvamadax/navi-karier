#!/bin/bash
# Tarik backup DB dari home-server ke mesin lain (disk berbeda), supaya satu disk rusak tidak menghilangkan data.
# Jalankan dari laptop/PC yang punya alias SSH `home-server-cf`:  bash deploy/pull-backups.sh [folder-tujuan]
# Dibuat dump baru dulu di server, lalu semua berkas yang belum ada disalin. Simpan 30 terakhir.
set -euo pipefail
HOST=${HOST:-home-server-cf}
DEST=${1:-$HOME/navikarier-backups}
mkdir -p "$DEST"

ssh -o ConnectTimeout=30 "$HOST" '~/navi-karier/deploy/backup.sh' >/dev/null
scp -q -o ConnectTimeout=30 "$HOST:navi-karier/deploy/backups/*.sql.gz" "$DEST/"

# berkas harus utuh: gzip -t gagal berarti salinan rusak
for f in "$DEST"/*.sql.gz; do gzip -t "$f"; done
ls -1t "$DEST"/*.sql.gz | tail -n +31 | xargs -r rm --
echo "ok: $(ls -1 "$DEST"/*.sql.gz | wc -l) backup di $DEST (terbaru: $(ls -1t "$DEST"/*.sql.gz | head -1 | xargs basename))"
