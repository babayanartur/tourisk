# Авторизация по email, backend и Expo Dev Build

## 1. Настройка отправки писем

Backend отправляет шестизначные одноразовые коды через Resend API. Код живёт 10 минут, повторная отправка разрешена через 60 секунд, после пяти неверных попыток код блокируется.

На сервере откройте `/var/www/tourisk/backend/.env` и добавьте:

```env
AUTH_CODE_SECRET=$(openssl rand -hex 48)
RESEND_API_KEY=ключ_из_Resend
EMAIL_FROM=Tourisk <login@tourisk.app>
EMAIL_REPLY_TO=support@tourisk.app
EMAIL_DEV_MODE=false
```

В Resend необходимо подтвердить домен `tourisk.app` и создать API key с правом отправки.

## 2. Mobile API

Во всех локальных и EAS-сборках используется:

```env
EXPO_PUBLIC_API_URL=https://back.tourisk.app/api
```

## 3. Expo Dev Build

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest init
npx eas-cli@latest build --profile development --platform ios
```

Для Android:

```bash
npx eas-cli@latest build --profile development --platform android
```

После установки development build:

```bash
npm run dev
```

## 4. GitHub

```bash
git add .
git commit -m "feat: email auth, production API and Expo dev build"
git branch -M main
git remote remove origin 2>/dev/null || true
git remote add origin https://github.com/babayanartur/tourisk.git
git push -u origin main
```

## 5. Сервер: чистое клонирование и перезапуск

```bash
cd /opt
sudo rm -rf tourisk-source
sudo git clone --depth 1 --branch main https://github.com/babayanartur/tourisk.git tourisk-source
cd /opt/tourisk-source
sudo bash deploy/redeploy-from-git.sh
```

Скрипт сохраняет production `.env` и загруженные изображения, затем ставит зависимости, запускает проверки, перезапускает PM2 и проверяет `/api/health`.
