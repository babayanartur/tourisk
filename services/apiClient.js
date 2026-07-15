import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";
import { STORAGE_KEYS } from "./storageKeys";

const DEFAULT_ANDROID_EMULATOR_URL = "http://10.0.2.2:8000";
const DEFAULT_IOS_SIMULATOR_URL = "http://127.0.0.1:8000";
const REQUEST_TIMEOUT_MS = 15000;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function getMetroHostUrl() {
  const hostUri = Constants.expoConfig?.hostUri || Constants.manifest2?.extra?.expoGo?.debuggerHost || "";
  const host = String(hostUri).split(":")[0];
  if (!host || host === "localhost" || host === "127.0.0.1") return "";
  return `http://${host}:8000`;
}

export const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ||
  normalizeBaseUrl(Constants.expoConfig?.extra?.apiUrl) ||
  getMetroHostUrl() ||
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
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (options.body !== undefined && !(options.body instanceof FormData)) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = `Bearer ${token}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(options.timeoutMs || REQUEST_TIMEOUT_MS));

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (error) {
    const networkError = new Error(
      error?.name === "AbortError"
        ? "Сервер Tourisk не ответил вовремя"
        : `Нет связи с backend: ${API_BASE_URL}`
    );
    networkError.code = "NETWORK_ERROR";
    throw networkError;
  } finally {
    clearTimeout(timeout);
  }

  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = { message: raw };
  }

  if (!response.ok) {
    const requestError = new Error(data?.message || data?.error || `HTTP ${response.status}`);
    requestError.status = response.status;
    requestError.code = "HTTP_ERROR";
    throw requestError;
  }

  return data;
}
