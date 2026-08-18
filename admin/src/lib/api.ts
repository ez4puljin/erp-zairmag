import axios from 'axios';

/** Хаяг нь энэ машины өөрийнх рүү заасан эсэх. */
const pointsToLocalhost = (url: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(url);

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
 *
 * Онцгой тохиолдол: `NEXT_PUBLIC_API_URL` нь localhost руу заасан атлаа
 * хуудсыг өөр машинаас (Tailscale, LAN) үзэж байвал уг тохиргоог үл
 * тоомсорлоно. Эс бөгөөс хөтөч *өөрийнхөө* localhost руу хандаж, эцэс
 * төгсгөлгүй "Ачааллаж байна..." дээр гацна.
 */
export function getApiUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL;

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port, origin } = window.location;
    const viewedLocally = hostname === 'localhost' || hostname === '127.0.0.1';

    if (configured && !(pointsToLocalhost(configured) && !viewedLocally)) {
      return configured;
    }
    if (port === '3001') return `${protocol}//${hostname}:3000`;
    return origin;
  }

  return configured || 'http://localhost:3000';
}

/**
 * Backend дээр хадгалагдсан зураг/файлын бүтэн хаяг.
 *
 * Модулийн түвшинд биш, дуудагдах үедээ тооцоолдог нь чухал — эс бөгөөс
 * SSR-ийн үед window байхгүй тул localhost руу заачихдаг.
 */
export function mediaUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${getApiUrl()}${path}`;
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
