import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { STORAGE_KEYS } from "./storageKeys";

const DEFAULT_IOS_SIMULATOR_URL = "http://localhost:8000";
const DEFAULT_ANDROID_EMULATOR_URL = "http://10.0.2.2:8000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Platform.OS === "android" ? DEFAULT_ANDROID_EMULATOR_URL : DEFAULT_IOS_SIMULATOR_URL);

export async function getAuthToken() {
  return AsyncStorage.getItem(STORAGE_KEYS.authToken);
}

export async function setAuthToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(STORAGE_KEYS.authToken);
    return;
  }

  await AsyncStorage.setItem(STORAGE_KEYS.authToken, token);
}

export async function clearSession() {
  await AsyncStorage.multiRemove([STORAGE_KEYS.authToken, STORAGE_KEYS.user]);
}

export async function apiRequest(path, options = {}) {
  const token = await getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const raw = await response.text();
  let data = null;

  try {
    data = raw ? JSON.parse(raw) : null;
  } catch (error) {
    data = { message: raw };
  }

  if (!response.ok) {
    throw new Error(data?.message || `HTTP ${response.status}`);
  }

  return data;
}
