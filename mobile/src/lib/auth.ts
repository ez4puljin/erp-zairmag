import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import api, { ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY, getCurrentBaseUrl } from './api';
import type { AuthResponse, User } from '../types';

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const baseUrl = getCurrentBaseUrl();
  const { data } = await axios.post<AuthResponse>(`${baseUrl}/api/auth/login`, {
    email,
    password,
  });

  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);
  } catch {
    // SecureStore not available in web — ignore
  }

  return data;
}

export async function register(registrationData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>(
    '/api/auth/register',
    registrationData,
  );

  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, data.accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refreshToken);

  return data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // Ignore errors - we still want to clear local tokens
  } finally {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  }
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get<User>('/api/auth/me');
  return data;
}

export async function getStoredToken(): Promise<string | null> {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function isAuthenticated(): Promise<boolean> {
  const token = await getStoredToken();
  return token !== null;
}
