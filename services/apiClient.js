import AsyncStorage from "@react-native-async-storage/async-storage";
import { STORAGE_KEYS } from "./storageKeys";

export const API_BASE_URL = "https://back.tourisk.app/api";

const DEFAULT_TIMEOUT_MS = 40000;

function buildApiUrl(path) {
  const normalizedPath = String(path || "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^api\/+/, "");

  return `${API_BASE_URL}/${normalizedPath}`;
}

function parseResponseBody(raw) {
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return {
      message: raw,
    };
  }
}

function createRequestError({
  message,
  code,
  status,
  url,
  data,
}) {
  const error = new Error(message);

  error.code = code;
  error.status = status;
  error.url = url;
  error.data = data;

  return error;
}

function xhrRequest({
  url,
  method,
  headers,
  body,
  timeoutMs,
}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.open(method, url, true);
    xhr.timeout = timeoutMs;

    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        xhr.setRequestHeader(key, String(value));
      }
    });

    xhr.onload = () => {
      const data = parseResponseBody(xhr.responseText);
      const status = Number(xhr.status || 0);

      console.log("[Tourisk API response]", {
        method,
        url,
        status,
        response: data,
      });

      if (status >= 200 && status < 300) {
        resolve(data);
        return;
      }

      reject(
        createRequestError({
          message:
            data?.message ||
            data?.error ||
            `Backend вернул HTTP ${status}`,
          code: "HTTP_ERROR",
          status,
          url,
          data,
        })
      );
    };

    xhr.onerror = () => {
      console.error("[Tourisk API native network error]", {
        method,
        url,
        readyState: xhr.readyState,
        status: xhr.status,
        responseText: xhr.responseText,
      });

      reject(
        createRequestError({
          message: [
            "Нативная сетевая ошибка iOS.",
            url,
            `status=${xhr.status || 0}`,
            `readyState=${xhr.readyState}`,
          ].join("\n"),
          code: "NETWORK_ERROR",
          status: Number(xhr.status || 0),
          url,
          data: null,
        })
      );
    };

    xhr.ontimeout = () => {
      console.error("[Tourisk API timeout]", {
        method,
        url,
        timeoutMs,
      });

      reject(
        createRequestError({
          message: [
            `Backend не ответил за ${Math.round(
              timeoutMs / 1000
            )} секунд.`,
            url,
          ].join("\n"),
          code: "TIMEOUT_ERROR",
          status: 0,
          url,
          data: null,
        })
      );
    };

    xhr.onabort = () => {
      reject(
        createRequestError({
          message: `Запрос был отменён.\n${url}`,
          code: "ABORT_ERROR",
          status: 0,
          url,
          data: null,
        })
      );
    };

    try {
      xhr.send(body === undefined ? null : body);
    } catch (originalError) {
      console.error("[Tourisk API send error]", {
        method,
        url,
        message: originalError?.message,
      });

      reject(
        createRequestError({
          message: [
            "Не удалось запустить запрос.",
            url,
            originalError?.message || "Unknown error",
          ].join("\n"),
          code: "REQUEST_SEND_ERROR",
          status: 0,
          url,
          data: null,
        })
      );
    }
  });
}

export async function getAuthToken() {
  return AsyncStorage.getItem(
    STORAGE_KEYS.authToken
  );
}

export async function setAuthToken(token) {
  if (!token) {
    await AsyncStorage.removeItem(
      STORAGE_KEYS.authToken
    );

    return;
  }

  await AsyncStorage.setItem(
    STORAGE_KEYS.authToken,
    token
  );
}

export async function clearSession() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.authToken,
    STORAGE_KEYS.user,
  ]);
}

export async function apiRequest(path, options = {}) {
  const url = buildApiUrl(path);
  const token = await getAuthToken();

  const method = String(
    options.method || "GET"
  ).toUpperCase();

  let body = options.body;

  const isFormData =
    typeof FormData !== "undefined" &&
    body instanceof FormData;

  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    typeof body !== "string"
  ) {
    body = JSON.stringify(body);
  }

  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };

  if (
    body !== undefined &&
    body !== null &&
    !isFormData &&
    !headers["Content-Type"] &&
    !headers["content-type"]
  ) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const timeoutMs = Number(
    options.timeoutMs || DEFAULT_TIMEOUT_MS
  );

  console.log("[Tourisk API request]", {
    method,
    url,
    timeoutMs,
    hasBody: body !== undefined && body !== null,
  });

  return xhrRequest({
    url,
    method,
    headers,
    body,
    timeoutMs,
  });
}
