import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest } from "./apiClient";
import { saveUser } from "./authService";
import { STORAGE_KEYS } from "./storageKeys";

export const DEFAULT_ACHIEVEMENTS = [
  {
    id: "first_step",
    title: "Первый шаг",
    description: "Сделай первый check-in",
    icon: "🧭",
    conditionType: "cells",
    conditionValue: 1,
    rewardXp: 20,
  },
  {
    id: "explorer",
    title: "Исследователь",
    description: "Открой 5 территорий",
    icon: "🗺️",
    conditionType: "cells",
    conditionValue: 5,
    rewardXp: 50,
  },
  {
    id: "traveler",
    title: "Путешественник",
    description: "Открой первую страну",
    icon: "🌍",
    conditionType: "countries",
    conditionValue: 1,
    rewardXp: 70,
  },
  {
    id: "pathfinder",
    title: "Первопроходец",
    description: "Открой 50 территорий",
    icon: "🏆",
    conditionType: "cells",
    conditionValue: 50,
    rewardXp: 200,
  },
];

export const DEFAULT_PAWNS = [
  {
    id: "pawn_green",
    name: "Зелёная фигурка",
    condition: "Доступна сразу",
    unlockType: "level",
    unlockValue: 1,
    image: "local:pawn_green",
  },
  {
    id: "pawn_bronze",
    name: "Бронзовая фигурка",
    condition: "Открой 10 территорий",
    unlockType: "cells",
    unlockValue: 10,
    image: "local:pawn_green",
  },
  {
    id: "pawn_gold",
    name: "Золотая фигурка",
    condition: "Достигни 5 уровня",
    unlockType: "level",
    unlockValue: 5,
    image: "local:pawn_green",
  },
];

export const DEFAULT_PLACES = [
  { id: "cascade", name: "Каскад", city: "Ереван", country: "Армения", latitude: 40.1919, longitude: 44.5152, rarity: "legendary", xp: 50 },
  { id: "republic", name: "Площадь Республики", city: "Ереван", country: "Армения", latitude: 40.1776, longitude: 44.5126, rarity: "legendary", xp: 50 },
  { id: "matenadaran", name: "Матенадаран", city: "Ереван", country: "Армения", latitude: 40.1912, longitude: 44.5213, rarity: "epic", xp: 40 },
  { id: "mother_armenia", name: "Мать Армения", city: "Ереван", country: "Армения", latitude: 40.2024, longitude: 44.5235, rarity: "legendary", xp: 60 },
  { id: "opera", name: "Оперный театр", city: "Ереван", country: "Армения", latitude: 40.1867, longitude: 44.5145, rarity: "rare", xp: 30 },
];

export async function getGameContent() {
  try {
    const data = await apiRequest("/api/game/content");

    return {
      achievements: data.achievements?.length ? data.achievements : DEFAULT_ACHIEVEMENTS,
      pawns: data.pawns?.length ? data.pawns : DEFAULT_PAWNS,
      places: data.places?.length ? data.places : DEFAULT_PLACES,
      appConfig: data.appConfig || {},
    };
  } catch (error) {
    return {
      achievements: DEFAULT_ACHIEVEMENTS,
      pawns: DEFAULT_PAWNS,
      places: DEFAULT_PLACES,
      appConfig: {},
    };
  }
}

export async function saveLocationProgress(payload) {
  try {
    const data = await apiRequest("/api/me/location", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data?.user) {
      await saveUser(data.user);
    }

    return data;
  } catch (error) {
    return null;
  }
}

export async function getLeaderboard() {
  try {
    const data = await apiRequest("/api/leaderboard");
    return data.items || [];
  } catch (error) {
    const userRaw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    const user = userRaw ? JSON.parse(userRaw) : null;

    return [
      {
        id: "local-user",
        nickname: user?.nickname || "Explorer",
        country: "Локальный мир",
        xp: user?.xp || 0,
        level: user?.level || 1,
        selectedPawn: user?.selectedPawn || "pawn_green",
      },
      { id: "demo-artur", nickname: "Artur", country: "Армения", xp: 2580, level: 27, selectedPawn: "pawn_green" },
      { id: "demo-liana", nickname: "Liana", country: "Грузия", xp: 1250, level: 13, selectedPawn: "pawn_green" },
      { id: "demo-alex", nickname: "Alex", country: "Турция", xp: 870, level: 9, selectedPawn: "pawn_green" },
    ].sort((a, b) => b.xp - a.xp);
  }
}
