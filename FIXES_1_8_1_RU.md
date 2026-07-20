# Tourisk 1.8.1 — облака и логика открытия карты

## Что изменено

- полностью переработан `GameFogOverlay`;
- открытая территория теперь раскрывается не круглой дыркой, а мягким игровым коридором;
- открытие идёт вокруг фигурки и вдоль фактически пройденного маршрута;
- сохранённые клетки карты тоже продолжают быть открытыми;
- увеличен локальный trail для карты: теперь хранится до 120 точек за 12 часов;
- добавлены новые объёмные облака `game-cloud-1..4`;
- усилен тёмный fantasy tint над спутниковой картой.

## Ключевые файлы

- `components/GameFogOverlay.js`
- `screens/MapScreen.js`
- `assets/fog/game-cloud-1.png`
- `assets/fog/game-cloud-2.png`
- `assets/fog/game-cloud-3.png`
- `assets/fog/game-cloud-4.png`

## Версия

- app version: `1.8.1`
- iOS buildNumber: `9`
- Android versionCode: `9`
