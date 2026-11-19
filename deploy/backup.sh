#!/bin/bash
# Backup harian DB. Cron: 15 3 * * * /home/arvamadax/navi-karier/deploy/backup.sh
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
f="backups/navikarier-$(date +%F).sql.gz"
docker compose -f docker-compose.prod.yml exec -T db pg_dump -U navi -d navikarier --no-owner | gzip > "$f"
gzip -t "$f"
find backups -name 'navikarier-*.sql.gz' -mtime +14 -delete
echo "ok: $f"
