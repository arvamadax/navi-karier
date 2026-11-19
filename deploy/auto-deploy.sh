#!/bin/bash
# CD pull-based. Cron tiap 2 menit: deploy hanya jika origin/main berubah DAN CI GitHub hijau.
# Server tidak punya port masuk (tunnel), jadi server yang menarik, bukan GitHub yang mendorong.
# Cron: */2 * * * * /home/arvamadax/navi-karier/deploy/auto-deploy.sh >> /home/arvamadax/navikarier-deploy.log 2>&1
set -euo pipefail
REPO=arvamadax/navi-karier
cd "$(dirname "$0")/.."
exec 9>/tmp/navikarier-deploy.lock
flock -n 9 || exit 0

log() { echo "$(date '+%F %T') $*"; }
compose() { (cd deploy && docker compose -f docker-compose.prod.yml --env-file .env "$@"); }
healthy() {
  for _ in $(seq 1 30); do
    curl -fsS -m 5 http://127.0.0.1:8191/api/health >/dev/null \
      && curl -fsS -m 5 -o /dev/null http://127.0.0.1:8190/ && return 0
    sleep 3
  done
  return 1
}

git fetch -q origin main
OLD=$(git rev-parse HEAD)
NEW=$(git rev-parse origin/main)
[ "$OLD" = "$NEW" ] && exit 0

# shortcut: check-runs API anonim (repo publik, limit 60/jam), cukup karena hanya dipanggil saat ada commit baru
CI=$(curl -fsS -m 15 "https://api.github.com/repos/$REPO/commits/$NEW/check-runs" | python3 -c '
import sys, json
r = json.load(sys.stdin)["check_runs"]
if not r or any(c["status"] != "completed" for c in r): print("pending")
elif all(c["conclusion"] in ("success", "skipped", "neutral") for c in r): print("ok")
else: print("fail")')
case "$CI" in
  pending) exit 0 ;;                                   # coba lagi di tick berikutnya
  fail) log "CI merah untuk ${NEW:0:7}, deploy dilewati"; exit 0 ;;
esac

log "deploy ${OLD:0:7} -> ${NEW:0:7}"
git merge --ff-only origin/main
compose up -d --build
if healthy; then
  log "OK ${NEW:0:7}"
  docker image prune -f >/dev/null
else
  log "GAGAL health check, rollback ke ${OLD:0:7}"
  git reset --hard "$OLD"
  compose up -d --build
  healthy && log "rollback OK" || log "rollback JUGA GAGAL, cek manual"
  exit 1
fi
