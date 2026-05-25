import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { NativeModules, Platform } from "react-native";

function makeTraceId() {
  return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getMetroHost(): string | null {
  try {
    const scriptURL: string | undefined = NativeModules?.SourceCode?.scriptURL;
    if (!scriptURL) return null;
    const parsed = new URL(scriptURL);
    return parsed.hostname || null;
  } catch {
    return null;
  }
}

function getDefaultBaseUrl(): string {
  const metroHost = getMetroHost();
  if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
    return `http://${metroHost}:8888/api/v1`;
  }

  return Platform.OS === "android"
    ? "http://10.0.2.2:8888/api/v1"
    : "http://localhost:8888/api/v1";
}

export function getResolvedApiBaseUrl(): string {
  return process.env.EXPO_PUBLIC_API_BASE_URL || getDefaultBaseUrl();
}

export function getIdentityStartCandidates(): string[] {
  const envBase = process.env.EXPO_PUBLIC_API_BASE_URL || "";
  const resolvedBase = getResolvedApiBaseUrl();
  const candidates = [
    `${resolvedBase}/identity/auth/start`,
    `${resolvedBase}/auth/start`,
    `${envBase}/identity/auth/start`,
    `${envBase}/auth/start`,
    "http://localhost:8888/api/v1/identity/auth/start",
    "http://127.0.0.1:8888/api/v1/identity/auth/start",
    "http://10.0.2.2:8888/api/v1/identity/auth/start",
    "http://localhost:8001/api/v1/auth/start",
    "http://127.0.0.1:8001/api/v1/auth/start",
    "http://10.0.2.2:8001/api/v1/auth/start",
  ].filter((v): v is string => Boolean(v));

  return [...new Set(candidates)];
}

const api = axios.create({
  baseURL: getResolvedApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  config.headers["X-Trace-Id"] = makeTraceId();
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config || {};
    const status = Number(error?.response?.status || 0);

    if (status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const refreshToken = await SecureStore.getItemAsync("refresh_token");
    if (!refreshToken) {
      return Promise.reject(error);
    }

    try {
      const refreshRes = await axios.post(
        `${getResolvedApiBaseUrl()}/identity/auth/refresh`,
        {},
        { headers: { Authorization: `Bearer ${refreshToken}` } }
      );
      if (!refreshRes.data?.success) {
        return Promise.reject(error);
      }

      const newAccess = refreshRes.data?.data?.access_token;
      const newRefresh = refreshRes.data?.data?.refresh_token;
      if (!newAccess) {
        return Promise.reject(error);
      }

      await SecureStore.setItemAsync("token", newAccess);
      if (newRefresh) {
        await SecureStore.setItemAsync("refresh_token", newRefresh);
      }

      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;
      return api(originalRequest);
    } catch {
      return Promise.reject(error);
    }
  }
);

export default api;
