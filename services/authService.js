import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, clearSession, setAuthToken } from "./apiClient";
import { STORAGE_KEYS } from "./storageKeys";

function normalizeUser(user) {
  const safeUser = user || {};

  return {
    id: safeUser.id || safeUser._id || "local-demo-user",
    email: safeUser.email || "demo@tourisk.local",
    nickname: safeUser.nickname || safeUser.name || "Explorer",
    xp: Number(safeUser.xp || 0),
    coins: Number(safeUser.coins || 0),
    level: Number(safeUser.level || 1),
    countriesCount: Number(safeUser.countriesCount || safeUser.countries || 0),
    citiesCount: Number(safeUser.citiesCount || safeUser.cities || 0),
    exploredKm2: Number(safeUser.exploredKm2 || safeUser.territories || 0),
    achievementsCount: Number(safeUser.achievementsCount || safeUser.achievements || 0),
    selectedPawn: safeUser.selectedPawn || "pawn_green",
    createdAt: safeUser.createdAt || new Date().toISOString(),
  };
}

export async function saveUser(user) {
  const normalized = normalizeUser(user);
  await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(normalized));
  return normalized;
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

export async function requestEmailCode(email) {
  try {
    return await apiRequest("/api/auth/email/request", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  } catch (error) {
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
    const current = (await getStoredUser()) || normalizeUser({});
    return saveUser({ ...current, ...data });
  }
}

export async function logout() {
  await clearSession();
}
