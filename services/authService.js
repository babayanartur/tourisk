import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, clearSession, setAuthToken } from "./apiClient";
import { STORAGE_KEYS } from "./storageKeys";
import { LevelEngine } from "../src/maps/services/LevelEngine";

function normalizeUser(user) {
  const safeUser = user || {};

  return {
    id: safeUser.id || safeUser._id || "local-demo-user",
    email: safeUser.email || "demo@tourisk.local",
    nickname: safeUser.nickname || safeUser.name || "Explorer",
    xp: Number(safeUser.xp || 0),
    coins: Number(safeUser.coins || 0),
    level: LevelEngine.getLevel(Number(safeUser.xp || 0)),
    countriesCount: Number(safeUser.countriesCount ?? (Array.isArray(safeUser.countries) ? safeUser.countries.length : safeUser.countries) ?? 0),
    citiesCount: Number(safeUser.citiesCount ?? (Array.isArray(safeUser.cities) ? safeUser.cities.length : safeUser.cities) ?? 0),
    exploredKm2: Number(safeUser.exploredKm2 ?? (Number(safeUser.territories || 0) * 0.01)),
    achievementsCount: Number(safeUser.achievementsCount || (Array.isArray(safeUser.achievements) ? safeUser.achievements.length : safeUser.achievements) || 0),
    achievements: Array.isArray(safeUser.achievements) ? safeUser.achievements : [],
    territories: Number(safeUser.territories || 0),
    openedPlaces: Array.isArray(safeUser.openedPlaces) ? safeUser.openedPlaces : [],
    visitedCells: Array.isArray(safeUser.visitedCells) ? safeUser.visitedCells : undefined,
    cities: Array.isArray(safeUser.cities) ? safeUser.cities : undefined,
    countries: Array.isArray(safeUser.countries) ? safeUser.countries : undefined,
    stars: Number(safeUser.stars || 0),
    distanceKm: Number(safeUser.distanceKm || 0),
    stepsCount: Number(safeUser.stepsCount || Math.round(Number(safeUser.distanceKm || 0) * 1000 / 0.75)),
    streakDays: Number(safeUser.streakDays || 1),
    lastActiveDate: safeUser.lastActiveDate || null,
    selectedPawn: safeUser.selectedPawn || "pawn_green",
    lastLocation: safeUser.lastLocation || null,
    transportMode: safeUser.transportMode || "stationary",
    createdAt: safeUser.createdAt || new Date().toISOString(),
  };
}


function getLocationTimestamp(location) {
  if (!location) return 0;
  const direct = Number(location.timestamp);
  if (Number.isFinite(direct) && direct > 0) return direct;
  const parsed = new Date(location.updatedAt || 0).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function newestLocation(...candidates) {
  return candidates
    .filter((item) => item?.latitude != null && item?.longitude != null)
    .sort((a, b) => getLocationTimestamp(b) - getLocationTimestamp(a))[0] || null;
}

export async function saveUser(user) {
  const [existingUserRaw, existingCellsRaw, existingOpenedRaw, lastKnownLocationRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.user),
    AsyncStorage.getItem(STORAGE_KEYS.visitedCells),
    AsyncStorage.getItem(STORAGE_KEYS.openedLegendaryPlaces),
    AsyncStorage.getItem(STORAGE_KEYS.lastKnownLocation),
  ]);
  const existingUser = existingUserRaw ? safeParse(existingUserRaw, {}) : {};
  const incoming = normalizeUser(user);
  const mergedLastLocation = newestLocation(
    safeParse(lastKnownLocationRaw, null),
    existingUser.lastLocation,
    incoming.lastLocation
  );
  const mergedCells = Array.from(new Set([
    ...safeParse(existingCellsRaw, []),
    ...(Array.isArray(existingUser.visitedCells) ? existingUser.visitedCells : []),
    ...(Array.isArray(incoming.visitedCells) ? incoming.visitedCells : []),
  ]));
  const mergedOpened = Array.from(new Set([
    ...safeParse(existingOpenedRaw, []),
    ...(Array.isArray(existingUser.openedPlaces) ? existingUser.openedPlaces : []),
    ...(Array.isArray(incoming.openedPlaces) ? incoming.openedPlaces : []),
  ]));
  const normalized = normalizeUser({
    ...existingUser,
    ...incoming,
    xp: Math.max(Number(existingUser.xp || 0), Number(incoming.xp || 0)),
    visitedCells: mergedCells,
    openedPlaces: mergedOpened,
    territories: Math.max(mergedCells.length, Number(incoming.territories || 0)),
    lastLocation: mergedLastLocation,
    transportMode: mergedLastLocation?.transportMode || incoming.transportMode || existingUser.transportMode || "stationary",
  });
  const writes = [[STORAGE_KEYS.user, JSON.stringify(normalized)]];

  writes.push([STORAGE_KEYS.visitedCells, JSON.stringify(mergedCells)]);
  writes.push([STORAGE_KEYS.openedLegendaryPlaces, JSON.stringify(mergedOpened)]);
  if (Number.isFinite(normalized.distanceKm)) {
    const localDistance = Number(await AsyncStorage.getItem(STORAGE_KEYS.totalDistanceMeters) || 0);
    writes.push([STORAGE_KEYS.totalDistanceMeters, String(Math.max(localDistance, normalized.distanceKm * 1000))]);
  }
  if (normalized.streakDays) writes.push([STORAGE_KEYS.streakDays, String(normalized.streakDays)]);
  if (normalized.lastActiveDate) {
    const date = new Date(normalized.lastActiveDate);
    if (!Number.isNaN(date.getTime())) {
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      writes.push([STORAGE_KEYS.lastActiveDate, key]);
    }
  }
  if (normalized.lastLocation?.latitude != null && normalized.lastLocation?.longitude != null) {
    writes.push([STORAGE_KEYS.lastKnownLocation, JSON.stringify({
      ...normalized.lastLocation,
      timestamp: getLocationTimestamp(normalized.lastLocation) || Date.now(),
    })]);
  }

  await AsyncStorage.multiSet(writes);
  return normalized;
}

function safeParse(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export async function getStoredUser() {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;

  try {
    return normalizeUser(JSON.parse(raw));
  } catch (error) {
    await AsyncStorage.removeItem(STORAGE_KEYS.user);
    return null;
  }
}


export async function syncCurrentUser() {
  const result = await apiRequest("/api/me");
  if (!result?.user) return getStoredUser();
  return saveUser(result.user);
}

export async function requestEmailCode(email) {
  try {
    return await apiRequest("/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch (error) {
    if (error?.code !== "NETWORK_ERROR") throw error;
    return {
      ok: true,
      offline: true,
      message: "Бэкенд недоступен. Для теста используй код 1111.",
      devCode: "1111",
    };
  }
}

export async function verifyEmailCode(email, code) {
  if (String(code).trim() !== "1111") {
    throw new Error("Для тестовой сборки код входа: 1111");
  }

  try {
    const result = await apiRequest("/api/auth/email/verify", {
      method: "POST",
      body: JSON.stringify({ email, code: "1111" }),
    });

    await setAuthToken(result.token);
    return saveUser(result.user);
  } catch (error) {
    if (error?.code !== "NETWORK_ERROR") throw error;
    const fallbackUser = normalizeUser({
      id: "local-demo-user",
      email,
      nickname: email.split("@")[0] || "Explorer",
      selectedPawn: "pawn_green",
    });

    await setAuthToken("local-demo-token");
    return saveUser(fallbackUser);
  }
}

export async function loginWithProvider(provider) {
  const providerName = provider === "apple" ? "Apple" : "Google";

  try {
    const result = await apiRequest("/api/auth/provider", {
      method: "POST",
      body: JSON.stringify({
        provider,
        email: `${provider}@tourisk.local`,
        name: `${providerName} Explorer`,
      }),
    });

    await setAuthToken(result.token);
    return saveUser(result.user);
  } catch (error) {
    if (error?.code !== "NETWORK_ERROR") throw error;
    const fallbackUser = normalizeUser({
      id: `local-${provider}`,
      email: `${provider}@tourisk.local`,
      nickname: `${providerName} Explorer`,
      selectedPawn: "pawn_green",
    });

    await setAuthToken(`local-${provider}-token`);
    return saveUser(fallbackUser);
  }
}

export async function updateProfile(data) {
  try {
    const result = await apiRequest("/api/me", {
      method: "PATCH",
      body: JSON.stringify(data),
    });

    return saveUser(result.user);
  } catch (error) {
    if (error?.code !== "NETWORK_ERROR") throw error;
    const current = (await getStoredUser()) || normalizeUser({});
    return saveUser({ ...current, ...data });
  }
}

export async function logout() {
  await clearSession();
}
