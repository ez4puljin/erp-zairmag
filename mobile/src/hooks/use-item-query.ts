import { useCallback, useEffect, useState } from 'react';
import api from '../lib/api';

interface UseItemQueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  mutate: (data: T | null) => void;
}

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30_000;

export function useItemQuery<T = any>(endpoint: string | null): UseItemQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(!!endpoint);
  const [error, setError] = useState<string | null>(null);

  const fetchItem = useCallback(async () => {
    if (!endpoint) return;
    try {
      const res = await api.get<any>(endpoint);
      const body = res.data?.data ?? res.data;
      setData(body);
      cache.set(endpoint, { data: body, timestamp: Date.now() });
      setError(null);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    if (!endpoint) { setLoading(false); return; }
    const cached = cache.get(endpoint);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchItem();
  }, [endpoint, fetchItem]);

  const mutate = useCallback((next: T | null) => {
    setData(next);
    if (endpoint) {
      if (next) cache.set(endpoint, { data: next, timestamp: Date.now() });
      else cache.delete(endpoint);
    }
  }, [endpoint]);

  return { data, loading, error, refetch: fetchItem, mutate };
}

export function invalidateItemCache(endpoint?: string) {
  if (!endpoint) { cache.clear(); return; }
  cache.delete(endpoint);
}
