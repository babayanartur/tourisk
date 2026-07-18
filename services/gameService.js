import AsyncStorage from "@react-native-async-storage/async-storage";
import { hydrateLegendaryPlace, legendaryPlaces } from "../data/legendaryPlaces";
import { apiRequest } from "./apiClient";
import { saveUser } from "./authService";
import { STORAGE_KEYS } from "./storageKeys";

export const DEFAULT_ACHIEVEMENTS = [
  {
    id: "first_step",
    title: "Первый шаг",
    description: "Открыть первую территорию",
    icon: "✦",
    conditionType: "cells",
    conditionValue: 1,
    rewardXp: 20,
  },
  {
    id: "distance_10",
    title: "Первые 10 км",
    description: "Пройти 10 километров",
    icon: "🥾",
    conditionType: "distanceKm",
    conditionValue: 10,
    rewardXp: 100,
  },
  {
    id: "legendary_5",
    title: "Хранитель легенд",
    description: "Открыть 5 легендарных мест",
    icon: "🏛️",
    conditionType: "legendaryPlaces",
    conditionValue: 5,
    rewardXp: 250,
  },
  {
    id: "area_100",
    title: "Картограф",
    description: "Исследовать 100 км² территории",
    icon: "🗺️",
    conditionType: "exploredKm2",
    conditionValue: 100,
    rewardXp: 500,
  },
  {
    id: "yerevan_all",
    title: "Сердце Еревана",
    description: "Открыть все места Еревана",
    icon: "🇦🇲",
    conditionType: "yerevanPlaces",
    conditionValue: 10,
    rewardXp: 700,
  },
  {
    id: "distance_100",
    title: "Дальняя дорога",
    description: "Пройти 100 километров",
    icon: "🧭",
    conditionType: "distanceKm",
    conditionValue: 100,
    rewardXp: 800,
  },
  {
    id: "hidden_5",
    title: "Тайный след",
    description: "Найти 5 скрытых мест",
    icon: "🔮",
    conditionType: "hiddenPlaces",
    conditionValue: 5,
    rewardXp: 450,
  },
  {
    id: "yerevan_10_percent",
    title: "Десятая часть",
    description: "Исследовать 10% Еревана",
    icon: "🌆",
    conditionType: "yerevanPercent",
    conditionValue: 10,
    rewardXp: 300,
  },
  {
    id: "stars_1000",
    title: "Звёздный путь",
    description: "Собрать 1000 звёзд",
    icon: "⭐",
    conditionType: "stars",
    conditionValue: 1000,
    rewardXp: 600,
  },
  {
    id: "streak_7",
    title: "Семь рассветов",
    description: "Заходить 7 дней подряд",
    icon: "🔥",
    conditionType: "streakDays",
    conditionValue: 7,
    rewardXp: 350,
  },
  {
    id: "first_country",
    title: "За границей карты",
    description: "Открыть первую страну",
    icon: "🌍",
    conditionType: "countries",
    conditionValue: 1,
    rewardXp: 70,
  },
  {
    id: "five_cities",
    title: "Городской маршрут",
    description: "Открыть 5 городов",
    icon: "🏙️",
    conditionType: "cities",
    conditionValue: 5,
    rewardXp: 220,
  },
  {
    id: "territories_50",
    title: "Первопроходец",
    description: "Открыть 50 территорий",
    icon: "🏆",
    conditionType: "cells",
    conditionValue: 50,
    rewardXp: 200,
  },
];

export const DEFAULT_PAWNS = [
  {
    id: "pawn_green",
    name: "Росток",
    rarity: "common",
    condition: "Доступна сразу",
    unlockType: "level",
    unlockValue: 1,
    imagePath: "/uploads/pawns/pawn_green_v14.png",
    glowColor: "#a9ec56",
    mapScale: 1,
  },
  {
    id: "pawn_bronze",
    name: "Следопыт",
    rarity: "uncommon",
    condition: "Пройди 10 км",
    unlockType: "distanceKm",
    unlockValue: 10,
    imagePath: "/uploads/pawns/pawn_bronze_v14.png",
    glowColor: "#d88c48",
    mapScale: 1,
  },
  {
    id: "pawn_silver",
    name: "Хранитель",
    rarity: "rare",
    condition: "Получи 3 достижения",
    unlockType: "achievements",
    unlockValue: 3,
    imagePath: "/uploads/pawns/pawn_silver_v14.png",
    glowColor: "#68d6ff",
    mapScale: 1,
  },
  {
    id: "pawn_gold",
    name: "Солнечный",
    rarity: "legendary",
    condition: "Собери 1000 звёзд",
    unlockType: "stars",
    unlockValue: 1000,
    imagePath: "/uploads/pawns/pawn_gold_v14.png",
    glowColor: "#f4c451",
    mapScale: 1.04,
  },
  {
    id: "pawn_azure",
    name: "Небесный",
    rarity: "rare",
    condition: "Исследуй 100 км²",
    unlockType: "exploredKm2",
    unlockValue: 100,
    imagePath: "/uploads/pawns/pawn_azure_v14.png",
    glowColor: "#68d6ff",
    mapScale: 1,
  },
  {
    id: "pawn_violet",
    name: "Сумеречный",
    rarity: "epic",
    condition: "Открой 10% Еревана",
    unlockType: "yerevanPercent",
    unlockValue: 10,
    imagePath: "/uploads/pawns/pawn_violet_v14.png",
    glowColor: "#c66dff",
    mapScale: 1,
  },
  {
    id: "pawn_ember",
    name: "Пламенный",
    rarity: "epic",
    condition: "Пройди 100 км",
    unlockType: "distanceKm",
    unlockValue: 100,
    imagePath: "/uploads/pawns/pawn_ember_v14.png",
    glowColor: "#ff6c45",
    mapScale: 1,
  },
  {
    id: "pawn_crystal",
    name: "Кристалл",
    rarity: "legendary",
    condition: "Открой 5 легендарных мест",
    unlockType: "legendaryPlaces",
    unlockValue: 5,
    imagePath: "/uploads/pawns/pawn_crystal_v14.png",
    glowColor: "#78ffd4",
    mapScale: 1.05,
  },
  {
    id: "pawn_shadow",
    name: "Тень",
    rarity: "shadow",
    condition: "Найди 5 скрытых мест",
    unlockType: "hiddenPlaces",
    unlockValue: 5,
    imagePath: "/uploads/pawns/pawn_shadow_v14.png",
    glowColor: "#8d72d8",
    mapScale: 1,
  },
  {
    id: "pawn_aurora",
    name: "Аврора",
    rarity: "mythic",
    condition: "Заходи 7 дней подряд",
    unlockType: "streakDays",
    unlockValue: 7,
    imagePath: "/uploads/pawns/pawn_aurora_v14.png",
    glowColor: "#78ffd4",
    mapScale: 1.05,
  },

];

export const DEFAULT_PLACES = legendaryPlaces.map((place) => ({ ...place }));


function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function hydratePawn(pawn) {
  const local = DEFAULT_PAWNS.find((item) => item.id === pawn?.id) || {};
  return {
    ...local,
    ...pawn,
    imagePath: pawn?.imagePath || local.imagePath || "",
    imageUrl: pawn?.imageUrl || "",
    glowColor: pawn?.glowColor || local.glowColor || "",
    mapScale: Number(pawn?.mapScale || local.mapScale || 1),
  };
}

function defaultContent() {
  return {
    achievements: DEFAULT_ACHIEVEMENTS,
    pawns: DEFAULT_PAWNS,
    places: DEFAULT_PLACES,
    appConfig: {},
    contentVersion: 0,
  };
}

function hydrateContent(raw = {}) {
  return {
    achievements: Array.isArray(raw.achievements) && raw.achievements.length
      ? raw.achievements
      : DEFAULT_ACHIEVEMENTS,
    pawns: Array.isArray(raw.pawns) && raw.pawns.length
      ? raw.pawns.map(hydratePawn)
      : DEFAULT_PAWNS,
    places: Array.isArray(raw.places) && raw.places.length
      ? raw.places.map(hydrateLegendaryPlace)
      : DEFAULT_PLACES,
    appConfig: raw.appConfig || {},
    contentVersion: raw.contentVersion || 0,
  };
}

export async function getCachedGameContent() {
  const cachedRaw = await AsyncStorage.getItem(STORAGE_KEYS.gameContent).catch(() => null);
  if (!cachedRaw) return defaultContent();
  try {
    return hydrateContent(JSON.parse(cachedRaw));
  } catch {
    return defaultContent();
  }
}

export async function refreshGameContent() {
  const data = await apiRequest("/api/game/content");
  const content = hydrateContent(data);
  await AsyncStorage.setItem(STORAGE_KEYS.gameContent, JSON.stringify(content));
  return content;
}

// Cache-first: screens draw immediately and refresh in the background instead
// of staring at a spinner while mobile networking remembers its purpose.
export async function getGameContent({ refresh = true } = {}) {
  const cached = await getCachedGameContent();
  if (refresh) refreshGameContent().catch(() => {});
  return cached;
}

export async function saveLocationProgress(payload) {
  try {
    const data = await apiRequest("/api/me/location", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    if (data?.user) data.user = await saveUser(data.user);
    return data;
  } catch (error) {
    return null;
  }
}

export async function savePlaceDiscovery(placeId) {
  try {
    const data = await apiRequest(`/api/me/discoveries/${encodeURIComponent(placeId)}`, {
      method: "POST",
      body: JSON.stringify({}),
    });
    if (data?.user) data.user = await saveUser(data.user);
    const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.pendingDiscoveries);
    const pending = safeJson(pendingRaw, []);
    if (pending.includes(placeId)) {
      await AsyncStorage.setItem(
        STORAGE_KEYS.pendingDiscoveries,
        JSON.stringify(pending.filter((id) => id !== placeId))
      );
    }
    return data;
  } catch (error) {
    const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.pendingDiscoveries).catch(() => null);
    const pending = safeJson(pendingRaw, []);
    if (!pending.includes(placeId)) {
      await AsyncStorage.setItem(STORAGE_KEYS.pendingDiscoveries, JSON.stringify([...pending, placeId]));
    }
    return null;
  }
}

export async function flushPendingDiscoveries() {
  const pendingRaw = await AsyncStorage.getItem(STORAGE_KEYS.pendingDiscoveries).catch(() => null);
  const pending = safeJson(pendingRaw, []);
  if (!Array.isArray(pending) || !pending.length) return [];

  const completed = [];
  for (const placeId of pending) {
    try {
      const data = await apiRequest(`/api/me/discoveries/${encodeURIComponent(placeId)}`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (data?.user) await saveUser(data.user);
      completed.push(placeId);
    } catch {}
  }

  if (completed.length) {
    await AsyncStorage.setItem(
      STORAGE_KEYS.pendingDiscoveries,
      JSON.stringify(pending.filter((id) => !completed.includes(id)))
    );
  }
  return completed;
}

export async function getLeaderboard() {
  try {
    const data = await apiRequest("/api/leaderboard");
    return data.items || [];
  } catch (error) {
    const userRaw = await AsyncStorage.getItem(STORAGE_KEYS.user);
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (!user) return [];

    const countries = Array.isArray(user.countries) ? user.countries : [];
    return [{
      ...user,
      id: user.id || "local-user",
      nickname: user.nickname || "Explorer",
      country: countries[countries.length - 1] || user.country || "Мир",
      xp: Number(user.xp || 0),
      level: Number(user.level || 1),
      selectedPawn: user.selectedPawn || "pawn_green",
    }];
  }
}
