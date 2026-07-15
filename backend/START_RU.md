# Запуск Tourisk Backend

```bash
npm install
npm start
```

По умолчанию backend запускается на `http://localhost:8000`, MongoDB ожидается на `mongodb://127.0.0.1:27017/tourisk`.

Админка:

```text
http://localhost:8000/admin
```

Проверка синтаксиса backend:

```bash
npm run check
```

При первом запуске выполняется безопасное добавление десяти легендарных мест и миграция старых ID. Пользовательские изображения в админке не перезаписываются.
