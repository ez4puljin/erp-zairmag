import { getCurrentBaseUrl } from './api';

/**
 * Build full image URL from relative path using current server URL.
 * Returns null if no imageUrl provided.
 */
export function getImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  // Already absolute URL
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) return imageUrl;
  // Relative path - prepend server URL
  const base = getCurrentBaseUrl();
  return `${base}${imageUrl}`;
}
