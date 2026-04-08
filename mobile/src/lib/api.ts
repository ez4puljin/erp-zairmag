import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const SERVER_URL_KEY = 'server_url';

const DEFAULT_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000';

// Dynamic base URL - read from SecureStore or fallback to env
let _baseUrl: string = DEFAULT_URL;

export async function getServerUrl(): Promise<string> {
  try {
    const saved = await SecureStore.getItemAsync(SERVER_URL_KEY);
    if (saved) {
      _baseUrl = saved;
      return saved;
    }
  } catch {}
  return DEFAULT_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  _baseUrl = url;
  await SecureStore.setItemAsync(SERVER_URL_KEY, url);
  api.defaults.baseURL = url;
}

export async function clearServerUrl(): Promise<void> {
  await SecureStore.deleteItemAsync(SERVER_URL_KEY);
  _baseUrl = DEFAULT_URL;
  api.defaults.baseURL = DEFAULT_URL;
}

export function getCurrentBaseUrl(): string {
  return _baseUrl;
}

// Initialize: load saved URL
getServerUrl().then(url => {
  _baseUrl = url;
  api.defaults.baseURL = url;
});

const api = axios.create({
  baseURL: _baseUrl,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach access token
api.interceptors.request.use(
  async (config) => {
    // Always use latest baseURL
    if (!config.baseURL || config.baseURL === DEFAULT_URL) {
      config.baseURL = _baseUrl;
    }
    const token = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle 401 with token refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const { data } = await axios.post(`${_baseUrl}/api/auth/refresh`, {
        refreshToken,
      });

      const { accessToken, refreshToken: newRefreshToken } = data;

      await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newRefreshToken);

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;
      processQueue(null, accessToken);

      return api(originalRequest);
    } catch (refreshError) {
      processQueue(refreshError, null);
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);

export { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, SERVER_URL_KEY };
export default api;
