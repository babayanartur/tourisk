import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { STORAGE_KEYS } from "./storageKeys";

const DEFAULT_PRODUCTION_API_URL = "https://back.tourisk.app/api";
const REQUEST_TIMEOUT_MS = 15000;

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

export const API_BASE_URL =
  normalizeBaseUrl(process.env.EXPO_PUBLIC_API_URL) ||
  normalizeBaseUrl(Constants.expoConfig?.extra?.apiUrl) ||
  DEFAULT_PRODUCTION_API_URL;

function buildApiUrl(path) {
  const normalizedPath = `/${String(path || "").replace(/^\/+/, "")}`;
  if (API_BASE_URL.endsWith("/api") && normalizedPath.startsWith("/api/")) {
    return `${API_BASE_URL}${normalizedPath.slice(4)}`;
  }
  return `${API_BASE_URL}${normalizedPath}`;
}

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
    response = await fetch(buildApiUrl(path), {
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
