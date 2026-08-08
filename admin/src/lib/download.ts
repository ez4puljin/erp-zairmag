import api from './api';

/**
 * Downloads a server file (e.g. .xlsx report) via the authenticated axios
 * instance and triggers a browser download. Reuses the auth/baseURL interceptor.
 */
export async function downloadFile(url: string, fallbackName = 'export.xlsx'): Promise<void> {
  const res = await api.get(url, { responseType: 'blob' });
  const cd = (res.headers['content-disposition'] as string | undefined) ?? '';
  let name = fallbackName;
  const m = cd.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  if (m) {
    try {
      name = decodeURIComponent(m[1]);
    } catch {
      name = m[1];
    }
  }
  const blob = new Blob([res.data]);
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
