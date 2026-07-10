# Tourisk MVP Stage 2

Expo + Node/Express/Mongo/Socket.IO MVP.

## Что входит

- Expo iOS приложение.
- Вход по email OTP, тестовый код: `1111`.
- Кнопки Apple / Google для MVP-логина.
- Главный экран в fantasy стиле.
- Карта с GPS, пешкой игрока, туманом, раскрытием клеток и исчезающим шлейфом.
- Профиль с никнеймом, статистикой, открытиями, ачивками и коллекцией фигурок.
- Лидеры с подиумом и рейтингом.
- Backend Node.js + Express + MongoDB + Socket.IO.
- Админка с логином/паролем, статистикой, CRUD ачивок/пешек/мест/пользователей.
- Загрузка изображений фигурок и бейджей через админку, не ссылкой.

## Запуск backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

Админка:

```text
http://localhost:8000/admin
```

Логин/пароль по умолчанию:

```text
admin
tourisk1111
```

## Запуск iOS Simulator

```bash
npm install
npm run ios
```

## Запуск на iPhone через Expo Go

```bash
EXPO_PUBLIC_API_URL=http://$(ipconfig getifaddr en0):8000 npx expo start
```

Потом сканируй QR через Expo Go.

## Важное по фоновой геолокации

В код добавлена базовая поддержка background location через `expo-task-manager` и `expo-location`. На iOS фоновые обновления зависят от разрешений и политики системы. Если пользователь полностью убил приложение из switcher, iOS может ограничить обновления. Спасибо Apple за очередную маленькую бюрократическую скульптуру.
