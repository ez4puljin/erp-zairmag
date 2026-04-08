import axios from 'axios';
import api from '@/lib/api';
import { AuthResponse, User } from '@/types';

function getBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return `http://${window.location.hostname}:3000`;
  }
  return 'http://localhost:3000';
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  // Use plain axios (no interceptors) so stale tokens don't interfere
  const { data } = await axios.post<AuthResponse>(`${getBaseUrl()}/api/auth/login`, { email, password });
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
}

export async function logout() {
  try { await api.post('/api/auth/logout'); } catch {}
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export async function getProfile(): Promise<User> {
  const { data } = await api.get('/api/auth/me');
  return data;
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export function isAuthenticated(): boolean {
  return !!getStoredToken();
}
