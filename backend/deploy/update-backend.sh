#!/usr/bin/env bash
set -Eeuo pipefail
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/var/www/tourisk"
APP_USER="${SUDO_USER:-$USER}"

if [[ $EUID -ne 0 ]]; then
  echo "Запусти: sudo bash deploy/update-backend.sh"
  exit 1
fi

rsync -a --delete --exclude='.env' --exclude='node_modules' "$ROOT_DIR/backend/" "$APP_ROOT/backend/"
rsync -a --delete "$ROOT_DIR/landing/" "$APP_ROOT/landing/"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"
sudo -u "$APP_USER" bash -lc "cd '$APP_ROOT/backend' && npm ci --omit=dev && npm run check && pm2 restart tourisk-back --update-env && pm2 save"
nginx -t
systemctl reload nginx
curl -fsS http://127.0.0.1:8000/api/health
