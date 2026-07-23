#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/var/www/tourisk"
BACKUP_DIR="/root/tourisk-deploy-backup"
APP_USER="$(stat -c '%U' "$APP_ROOT/backend" 2>/dev/null || echo "${SUDO_USER:-root}")"

if [[ $EUID -ne 0 ]]; then
  echo "Запусти из свежего клона: sudo bash deploy/redeploy-from-git.sh"
  exit 1
fi

if [[ ! -f "$APP_ROOT/backend/.env" ]]; then
  echo "Не найден production .env: $APP_ROOT/backend/.env"
  echo "Для первой установки используй: sudo bash deploy/install-server.sh"
  exit 1
fi

rm -rf "$BACKUP_DIR"
mkdir -p "$BACKUP_DIR/uploads"
cp "$APP_ROOT/backend/.env" "$BACKUP_DIR/backend.env"
[[ -d "$APP_ROOT/backend/uploads" ]] && rsync -a "$APP_ROOT/backend/uploads/" "$BACKUP_DIR/uploads/"

mkdir -p "$APP_ROOT/backend" "$APP_ROOT/landing"
rsync -a --delete --exclude='.env' --exclude='node_modules' --exclude='uploads' "$ROOT_DIR/backend/" "$APP_ROOT/backend/"
rsync -a --delete --exclude='node_modules' --exclude='.next' "$ROOT_DIR/landing/" "$APP_ROOT/landing/"

cp "$BACKUP_DIR/backend.env" "$APP_ROOT/backend/.env"
mkdir -p "$APP_ROOT/backend/uploads"
rsync -a "$BACKUP_DIR/uploads/" "$APP_ROOT/backend/uploads/"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"
chmod 600 "$APP_ROOT/backend/.env"

sudo -u "$APP_USER" bash -lc "cd '$APP_ROOT/backend' && npm ci --omit=dev && npm run check && pm2 startOrRestart ecosystem.config.cjs --update-env && pm2 save"

nginx -t
systemctl reload nginx
curl -fsS http://127.0.0.1:8000/api/health
printf '\nTourisk развёрнут из свежего Git-клона.\n'
