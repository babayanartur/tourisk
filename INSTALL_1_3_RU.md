# Установка Tourisk Mobile 1.3.0

```bash
cd /Users/macbook/Desktop/tourisk
rm -rf node_modules .expo
npm config set registry https://registry.npmjs.org/
npm run setup
npm start
```

`npm run setup` использует публичный npm registry и локальную версию Expo SDK 54. Скрипт запуска не вызывает `npx` и не скачивает Expo 57 самовольно.

Backend должен быть доступен телефону по адресу компьютера в локальной сети на порту `8000`. Скрипт `npm start` определяет LAN IP автоматически.
