import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storageKeys";

export async function getPlayerStats() {
  const [checkinsRaw, cellsRaw, userRaw, openedRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.checkins),
    AsyncStorage.getItem(STORAGE_KEYS.visitedCells),
    AsyncStorage.getItem(STORAGE_KEYS.user),
    AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
  ]);

  const checkins = checkinsRaw ? JSON.parse(checkinsRaw) : [];
  const visitedCells = cellsRaw ? JSON.parse(cellsRaw) : [];
  const openedLegendaryPlaces = openedRaw ? JSON.parse(openedRaw) : [];
  const user = userRaw ? JSON.parse(userRaw) : {};

  const uniqueCities = checkins.filter((item, index, array) => {
    const city = (item.title || item.city || "").toLowerCase();
    return index === array.findIndex((x) => (x.title || x.city || "").toLowerCase() === city);
  });

  const cities = Math.max(uniqueCities.length, user.citiesCount || 0);
  const countries = Math.max(new Set(uniqueCities.map((c) => c.country).filter(Boolean)).size, user.countriesCount || 0);
  const territories = Math.max(visitedCells.length, user.territories || 0);
  const exploredKm2 = Number((territories * 0.01).toFixed(2));
  const xp = Math.max(user.xp || 0, territories * 10 + openedLegendaryPlaces.length * 50 + cities * 20);
  const coins = Math.max(user.coins || 0, territories * 3 + cities * 10);
  const achievements = Math.max(user.achievementsCount || 0, territories > 0 ? 1 : 0);
  const level = Math.floor(xp / 100) + 1;

  return {
    checkins,
    visitedCells,
    uniqueCheckins: uniqueCities,
    cities,
    countries,
    xp,
    coins,
    territories,
    exploredKm2,
    achievements,
    level,
  };
}
