# Tourisk: production-развёртывание

Архитектура рассчитана на **DatabaseMart Linux VPS с Shared IP**:

- `tourisk.app` и `www.tourisk.app` → внутренний порт `8080` → лендинг;
- `admin.tourisk.app` → внутренний порт `8081` → админка + прокси `/api`;
- `back.tourisk.app` → внутренний порт `8082` → backend;
- Node.js backend слушает только `127.0.0.1:8000`;
- MongoDB слушает локально и работает с авторизацией;
- публичный HTTPS завершается на шлюзе DatabaseMart через **Enable Free SSL**.

## 1. Cloudflare DNS

На первом этапе поставьте записи в режим **DNS only**:

| Тип | Имя | Значение |
|---|---|---|
| A | `@` | `93.127.132.192` |
| CNAME | `www` | `tourisk.app` |
| A | `admin` | `93.127.132.192` |
| A | `back` | `93.127.132.192` |

## 2. Подключение к серверу

```bash
ssh -p 10070 administrator@93.127.132.192
```

Пароль сервера попал на скриншот. Сразу после входа смените его:

```bash
passwd
```

## 3. Загрузка архива

С компьютера, из папки с архивом:

```bash
scp -P 10070 tourisk_server_ready.zip administrator@93.127.132.192:/home/administrator/
```

На сервере:

```bash
cd /home/administrator
rm -rf tourisk_server_ready
unzip tourisk_server_ready.zip
cd tourisk_server_ready
sudo bash deploy/install-server.sh
```

## 4. DatabaseMart domain mapping

В разделе VPS → Networking / Website Management добавьте:

| Domain | Internal port |
|---|---:|
| `tourisk.app` | `8080` |
| `www.tourisk.app` | `8080` |
| `admin.tourisk.app` | `8081` |
| `back.tourisk.app` | `8082` |

На каждом домене включите **Enable Free SSL**.

## 5. Cloudflare после выпуска SSL

Когда все три адреса открываются по HTTPS:

1. переключите web-записи в **Proxied**;
2. SSL/TLS → **Full (strict)**;
3. включите **Always Use HTTPS**.

## 6. Проверки

```bash
pm2 status
sudo systemctl status mongod --no-pager
sudo nginx -t
curl http://127.0.0.1:8000/api/health
curl -I http://127.0.0.1:8080
curl -I http://127.0.0.1:8081
curl -I http://127.0.0.1:8082/api/health
sudo cat /root/tourisk-credentials.txt
```

После настройки доменов:

```bash
curl -I https://www.tourisk.app
curl -I https://admin.tourisk.app
curl https://back.tourisk.app/api/health
```

## 7. Мобильное приложение

Production API URL:

```bash
EXPO_PUBLIC_API_URL=https://back.tourisk.app
```

Для EAS:

```bash
eas env:create --name EXPO_PUBLIC_API_URL --value https://back.tourisk.app --environment production --visibility plaintext
```

## Обновление backend и лендинга

Загрузите новую версию архива, распакуйте и выполните:

```bash
sudo bash deploy/update-backend.sh
```
