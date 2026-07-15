import AsyncStorage from "@react-native-async-storage/async-storage";
import { canonicalLegendaryPlaceId } from "../data/legendaryPlaces";
import { DEFAULT_ACHIEVEMENTS, DEFAULT_PLACES, getGameContent } from "./gameService";
import { isRequirementMet } from "./progression";
import { STORAGE_KEYS } from "./storageKeys";

export async function getPlayerStats() {
  const [checkinsRaw, cellsRaw, userRaw, openedRaw, distanceRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.checkins),
    AsyncStorage.getItem(STORAGE_KEYS.visitedCells),
    AsyncStorage.getItem(STORAGE_KEYS.user),
    AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
    AsyncStorage.getItem(STORAGE_KEYS.totalDistanceMeters),
  ]);

  const content = await getGameContent().catch(() => ({ achievements: DEFAULT_ACHIEVEMENTS, places: DEFAULT_PLACES }));
  const achievementCatalog = content.achievements?.length ? content.achievements : DEFAULT_ACHIEVEMENTS;
  const placeCatalog = content.places?.length ? content.places : DEFAULT_PLACES;

  const checkins = safeJson(checkinsRaw, []);
  const visitedCells = safeJson(cellsRaw, []);
  const user = safeJson(userRaw, {});
  const openedPlaces = Array.from(new Set([
    ...safeJson(openedRaw, []),
    ...(Array.isArray(user.openedPlaces) ? user.openedPlaces : []),
  ].map(canonicalLegendaryPlaceId)));
  AsyncStorage.setItem(STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(openedPlaces)).catch(() => {});
  const streakDays = await updateDailyStreak();

  const uniqueCities = checkins.filter((item, index, array) => {
    const city = String(item.title || item.city || "").toLowerCase();
    return city && index === array.findIndex((x) => String(x.title || x.city || "").toLowerCase() === city);
  });

  const cities = Math.max(uniqueCities.length, Number(user.citiesCount || 0));
  const countries = Math.max(
    new Set(uniqueCities.map((item) => item.country).filter(Boolean)).size,
    Number(user.countriesCount || 0)
  );
  const territories = Math.max(visitedCells.length, Number(user.territories || 0));
  const exploredKm2 = Math.max(Number((territories * 0.01).toFixed(2)), Number(user.exploredKm2 || 0));
  const distanceKm = Math.max(Number((Number(distanceRaw || 0) / 1000).toFixed(2)), Number(user.distanceKm || 0));
  const hiddenPlaces = openedPlaces.filter((id) => placeCatalog.some((place) => place.id === id && place.rarity === "hidden")).length;
  const legendaryPlaces = openedPlaces.filter((id) => placeCatalog.some((place) => place.id === id && place.rarity === "legendary")).length;
  const yerevanPlaces = openedPlaces.filter((id) => placeCatalog.some((place) => place.id === id && place.city === "Ереван")).length;
  const yerevanPercent = Math.min(100, Number((territories / 10).toFixed(1)));
  const xp = Math.max(
    Number(user.xp || 0),
    territories * 10 + legendaryPlaces * 50 + hiddenPlaces * 70 + cities * 20
  );
  const stars = Math.max(Number(user.stars || 0), xp);
  const coins = Math.max(Number(user.coins || 0), territories * 3 + cities * 10);
  const level = Math.floor(xp / 100) + 1;

  const baseStats = {
    checkins,
    visitedCells,
    openedPlaces,
    uniqueCheckins: uniqueCities,
    cities,
    countries,
    xp,
    stars,
    coins,
    territories,
    exploredKm2,
    distanceKm,
    hiddenPlaces,
    legendaryPlaces,
    yerevanPlaces,
    yerevanPercent,
    streakDays,
    level,
    selectedPawn: user.selectedPawn || "pawn_green",
  };

  const calculatedAchievements = achievementCatalog.filter((achievement) => isRequirementMet(achievement, baseStats)).length;
  const achievements = Math.max(Number(user.achievementsCount || 0), calculatedAchievements);

  return {
    ...baseStats,
    achievements,
  };
}

async function updateDailyStreak() {
  const today = localDateKey(new Date());
  const [lastDate, streakRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.lastActiveDate),
    AsyncStorage.getItem(STORAGE_KEYS.streakDays),
  ]);

  let streak = Math.max(1, Number(streakRaw || 1));
  if (!lastDate) {
    await AsyncStorage.multiSet([
      [STORAGE_KEYS.lastActiveDate, today],
      [STORAGE_KEYS.streakDays, "1"],
    ]);
    return 1;
  }

  if (lastDate === today) return streak;

  const difference = dayDifference(lastDate, today);
  streak = difference === 1 ? streak + 1 : 1;
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.lastActiveDate, today],
    [STORAGE_KEYS.streakDays, String(streak)],
  ]);
  return streak;
}

function localDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayDifference(from, to) {
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function safeJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}
