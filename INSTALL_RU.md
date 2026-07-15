# Tourisk Mobile 1.3.0 — установка

```bash
cd /Users/macbook/Desktop/tourisk
rm -rf node_modules .expo
npm config set registry https://registry.npmjs.org/
npm run setup
npm start
```

Проект использует Expo SDK 54 и `react-native-svg` 15.12.1. `npm start` запускает локальный Expo и не вызывает `npx`.

Backend должен работать на порту `8000` и быть доступен по LAN. Скрипт запуска автоматически подставляет IP компьютера в `EXPO_PUBLIC_API_URL`.
