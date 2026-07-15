# Tourisk Backend 1.3.0 — установка

```bash
cd /Users/macbook/Desktop/tourisk-back
cp .env.example .env
npm config set registry https://registry.npmjs.org/
npm run setup
npm start
```

Файлы фигурок хранятся на backend в `uploads/pawns/`. Через админку можно создавать, редактировать, отключать и удалять фигурки, загружать PNG/JPG/WEBP, задавать редкость, свечение, масштаб на карте и условие открытия.
