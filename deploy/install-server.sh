#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_ROOT="/var/www/tourisk"
APP_USER="${SUDO_USER:-$USER}"
APP_HOME="$(getent passwd "$APP_USER" | cut -d: -f6)"
CREDENTIALS_FILE="/root/tourisk-credentials.txt"

if [[ $EUID -ne 0 ]]; then
  echo "Запусти скрипт через sudo: sudo bash deploy/install-server.sh"
  exit 1
fi

if [[ ! -f /etc/os-release ]] || ! grep -q 'VERSION_ID="24.04"' /etc/os-release; then
  echo "Скрипт рассчитан на Ubuntu 24.04 LTS. Текущая ОС:"
  cat /etc/os-release || true
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
apt-get update
apt-get install -y ca-certificates curl gnupg unzip rsync nginx ufw openssl

# Node.js 24 LTS
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs
npm install -g pm2

# MongoDB 8.0 Community for Ubuntu 24.04
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg --dearmor --yes -o /etc/apt/keyrings/mongodb-server-8.0.gpg
echo "deb [ arch=amd64,arm64 signed-by=/etc/apt/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" > /etc/apt/sources.list.d/mongodb-org-8.0.list
apt-get update
apt-get install -y mongodb-org
systemctl enable --now mongod

EXISTING_ENV="$APP_ROOT/backend/.env"
FIRST_INSTALL=1

if [[ -f "$EXISTING_ENV" ]]; then
  FIRST_INSTALL=0
  DB_USER="$(sed -nE 's#^MONGO_URI=mongodb://([^:]+):.*#\1#p' "$EXISTING_ENV" | head -n1)"
  DB_PASSWORD="$(sed -nE 's#^MONGO_URI=mongodb://[^:]+:([^@]+)@.*#\1#p' "$EXISTING_ENV" | head -n1)"
  JWT_SECRET="$(sed -n 's/^JWT_SECRET=//p' "$EXISTING_ENV" | head -n1)"
  ADMIN_JWT_SECRET="$(sed -n 's/^ADMIN_JWT_SECRET=//p' "$EXISTING_ENV" | head -n1)"
  ADMIN_PASSWORD="$(sed -n 's/^ADMIN_PASSWORD=//p' "$EXISTING_ENV" | head -n1)"
  ADMIN_KEY="$(sed -n 's/^ADMIN_KEY=//p' "$EXISTING_ENV" | head -n1)"
else
  DB_USER="tourisk_app"
  DB_PASSWORD="$(openssl rand -hex 24)"
  JWT_SECRET="$(openssl rand -hex 48)"
  ADMIN_JWT_SECRET="$(openssl rand -hex 48)"
  ADMIN_PASSWORD="$(openssl rand -base64 24 | tr -dc 'A-Za-z0-9' | head -c 24)"
  ADMIN_KEY="$(openssl rand -hex 32)"
fi

if [[ "$FIRST_INSTALL" -eq 1 ]]; then
  if grep -q 'authorization: enabled' /etc/mongod.conf; then
    echo "MongoDB authorization уже включена, но старый .env не найден. Нужны существующие реквизиты MongoDB."
    exit 1
  fi
  mongosh --quiet --eval "db.getSiblingDB('tourisk').createUser({user:'${DB_USER}',pwd:'${DB_PASSWORD}',roles:[{role:'readWrite',db:'tourisk'}]})"
fi

if ! grep -q '^security:' /etc/mongod.conf; then
  cat >> /etc/mongod.conf <<'MONGOSECURITY'
security:
  authorization: enabled
MONGOSECURITY
elif ! grep -q 'authorization: enabled' /etc/mongod.conf; then
  sed -i '/^security:/a\  authorization: enabled' /etc/mongod.conf
fi
systemctl restart mongod

mkdir -p "$APP_ROOT/backend" "$APP_ROOT/landing"
rsync -a --delete --exclude='.env' --exclude='node_modules' "$ROOT_DIR/backend/" "$APP_ROOT/backend/"
rsync -a --delete "$ROOT_DIR/landing/" "$APP_ROOT/landing/"
chown -R "$APP_USER:$APP_USER" "$APP_ROOT"

cat > "$APP_ROOT/backend/.env" <<ENVFILE
NODE_ENV=production
HOST=127.0.0.1
PORT=8000
MONGO_URI=mongodb://${DB_USER}:${DB_PASSWORD}@127.0.0.1:27017/tourisk?authSource=tourisk
JWT_SECRET=${JWT_SECRET}
ADMIN_JWT_SECRET=${ADMIN_JWT_SECRET}
ADMIN_LOGIN=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
ADMIN_KEY=${ADMIN_KEY}
APP_URL=https://www.tourisk.app
PUBLIC_URL=https://back.tourisk.app
CORS_ORIGINS=https://tourisk.app,https://www.tourisk.app,https://admin.tourisk.app
ENVFILE
chown "$APP_USER:$APP_USER" "$APP_ROOT/backend/.env"
chmod 600 "$APP_ROOT/backend/.env"

sudo -u "$APP_USER" bash -lc "cd '$APP_ROOT/backend' && npm ci --omit=dev && npm run check"

cp "$ROOT_DIR/deploy/nginx/tourisk.conf" /etc/nginx/sites-available/tourisk.conf
ln -sfn /etc/nginx/sites-available/tourisk.conf /etc/nginx/sites-enabled/tourisk.conf
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable --now nginx
systemctl reload nginx

sudo -u "$APP_USER" bash -lc "cd '$APP_ROOT/backend' && pm2 delete tourisk-back >/dev/null 2>&1 || true && pm2 start ecosystem.config.cjs && pm2 save"
pm2 startup systemd -u "$APP_USER" --hp "$APP_HOME" >/tmp/tourisk-pm2-startup.log 2>&1 || true
systemctl enable "pm2-${APP_USER}" >/dev/null 2>&1 || true
systemctl restart "pm2-${APP_USER}" >/dev/null 2>&1 || true

ufw allow OpenSSH >/dev/null 2>&1 || true
ufw allow 8080/tcp
ufw allow 8081/tcp
ufw allow 8082/tcp
ufw --force enable

cat > "$CREDENTIALS_FILE" <<CREDS
Tourisk production credentials
Generated: $(date -u +'%Y-%m-%dT%H:%M:%SZ')

Admin URL: https://admin.tourisk.app
Admin login: admin
Admin password: ${ADMIN_PASSWORD}

MongoDB bind: 127.0.0.1:27017
MongoDB database: tourisk
MongoDB user: ${DB_USER}
MongoDB password: ${DB_PASSWORD}

Backend health: https://back.tourisk.app/api/health
Mobile API URL: https://back.tourisk.app
CREDS
chmod 600 "$CREDENTIALS_FILE"

sleep 3
curl -fsS http://127.0.0.1:8000/api/health
printf '\n\nЛокальные проверки:\n'
curl -I -s http://127.0.0.1:8080 | head -n 1
curl -I -s http://127.0.0.1:8081 | head -n 1
curl -I -s http://127.0.0.1:8082/api/health | head -n 1

cat <<DONE

Tourisk установлен.

DatabaseMart domain mapping:
  tourisk.app      -> internal port 8080
  www.tourisk.app  -> internal port 8080
  admin.tourisk.app -> internal port 8081
  back.tourisk.app  -> internal port 8082

Для просмотра сгенерированных логинов:
  sudo cat ${CREDENTIALS_FILE}

Проверки:
  pm2 status
  sudo systemctl status mongod --no-pager
  sudo nginx -t
  curl http://127.0.0.1:8000/api/health
DONE
