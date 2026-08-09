import axios from 'axios';

/**
 * Backend API-ийн үндсэн хаягийг тодорхойлно.
 *
 * 1. `NEXT_PUBLIC_API_URL` тохируулсан бол түүнийг шууд ашиглана
 *    (Vercel + тусдаа байрлуулсан backend-д зориулав).
 * 2. Admin-ыг шууд 3001 порт дээр үзэж байвал backend нь ижил хост дээр
 *    3000 порт дээр байна (локал болон LAN-аар хөгжүүлэлт).
 * 3. Бусад тохиолдолд reverse proxy (Tailscale serve, nginx, Caddy) ижил
 *    origin доор /api-г дамжуулж байна гэж үзнэ — ингэснээр HTTPS хуудаснаас
 *    HTTP руу хандах болон CORS-ын асуудал огт үүсэхгүй.
 */
function getApiUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    if (port === '3001') return `${protocol}//${hostname}:3000`;
    return origin;
  }
  return 'http://localhost:3000';
}

const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
});

// Set baseURL dynamically on every request (handles SSR → client hydration)
api.interceptors.request.use((config) => {
  config.baseURL = getApiUrl();
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = localStorage.getItem('refreshToken');
        const { data } = await axios.post(`${getApiUrl()}/api/auth/refresh`, { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        if (typeof window !== 'undefined') window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export default api;
