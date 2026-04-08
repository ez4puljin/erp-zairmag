import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../lib/api';

interface PaginatedResponse<T> {
  data: T[];
  meta?: { total: number; page: number; limit: number; totalPages: number };
}

interface UseListQueryOptions {
  enabled?: boolean;
  pageSize?: number;
  paginated?: boolean; // backend returns { data, meta } or raw array
}

interface UseListQueryResult<T> {
  data: T[];
  total: number;
  loading: boolean;
  refreshing: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  mutate: (updater: (prev: T[]) => T[]) => void;
}

// Simple in-memory cache (TTL 30s)
const cache = new Map<string, { data: any[]; total: number; timestamp: number }>();
const CACHE_TTL = 30_000;

export function useListQuery<T = any>(
  endpoint: string | null,
  params: Record<string, any> = {},
  options: UseListQueryOptions = {},
): UseListQueryResult<T> {
  const { enabled = true, pageSize = 20, paginated = true } = options;

  const [data, setData] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const cacheKey = endpoint ? `${endpoint}?${JSON.stringify(params)}` : '';
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const fetchPage = useCallback(
    async (pageNum: number, isRefresh = false) => {
      if (!endpoint || !enabled) return;
      try {
        const query = new URLSearchParams();
        if (paginated) {
          query.set('page', String(pageNum));
          query.set('limit', String(pageSize));
        }
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== null && v !== '') query.set(k, String(v));
        }
        const url = `${endpoint}?${query.toString()}`;
        const res = await api.get<PaginatedResponse<T> | T[]>(url);

        const body = res.data as any;
        const items: T[] = Array.isArray(body) ? body : body.data ?? [];
        const newTotal = Array.isArray(body) ? items.length : body.meta?.total ?? items.length;

        if (!mountedRef.current) return;

        if (pageNum === 1) {
          setData(items);
          setTotal(newTotal);
          cache.set(cacheKey, { data: items, total: newTotal, timestamp: Date.now() });
        } else {
          setData(prev => [...prev, ...items]);
        }
        setHasMore(items.length === pageSize && paginated);
        setError(null);
      } catch (err: any) {
        if (!mountedRef.current) return;
        setError(err?.response?.data?.message || err?.message || 'Алдаа гарлаа');
      } finally {
        if (!mountedRef.current) return;
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [endpoint, enabled, cacheKey, pageSize, paginated, JSON.stringify(params)],
  );

  // Initial load - check cache first
  useEffect(() => {
    if (!endpoint || !enabled) return;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      setData(cached.data);
      setTotal(cached.total);
      setLoading(false);
      return;
    }
    setLoading(true);
    setPage(1);
    fetchPage(1);
  }, [cacheKey, enabled, endpoint]);

  const refetch = useCallback(async () => {
    if (!endpoint) return;
    setRefreshing(true);
    setPage(1);
    cache.delete(cacheKey);
    await fetchPage(1, true);
  }, [endpoint, cacheKey, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading) return;
    setLoadingMore(true);
    const next = page + 1;
    setPage(next);
    await fetchPage(next);
  }, [hasMore, loadingMore, loading, page, fetchPage]);

  const mutate = useCallback((updater: (prev: T[]) => T[]) => {
    setData(prev => {
      const next = updater(prev);
      cache.set(cacheKey, { data: next, total, timestamp: Date.now() });
      return next;
    });
  }, [cacheKey, total]);

  return { data, total, loading, refreshing, loadingMore, error, hasMore, refetch, loadMore, mutate };
}

export function invalidateListCache(endpointPrefix?: string) {
  if (!endpointPrefix) {
    cache.clear();
    return;
  }
  for (const key of cache.keys()) {
    if (key.startsWith(endpointPrefix)) cache.delete(key);
  }
}
