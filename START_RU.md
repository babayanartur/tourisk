# Запуск Tourisk Mobile

```bash
npm install
npm start
```

Для iOS Simulator backend по умолчанию ожидается по адресу `http://127.0.0.1:8000`.
Для Android Emulator используется `http://10.0.2.2:8000`.

Проверка production-сборки JavaScript:

```bash
npm run check
```

На симуляторе стандартная тестовая геолокация заменяется на центр Еревана. На физическом устройстве приложение использует фактический GPS.
