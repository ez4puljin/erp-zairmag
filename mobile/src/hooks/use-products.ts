import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import type { Category, PaginatedResponse, Product } from '../types';

export function useProducts(categoryId?: string, search?: string) {
  return useQuery<PaginatedResponse<Product>>({
    queryKey: ['products', { categoryId, search }],
    queryFn: async () => {
      const params: Record<string, string> = { limit: '100' };
      if (categoryId) params.categoryId = categoryId;
      if (search) params.search = search;

      const { data } = await api.get<PaginatedResponse<Product>>(
        '/api/products',
        { params },
      );
      // Backend returns Decimal as string — coerce to number
      data.data = data.data.map((p) => ({
        ...p,
        sellingPrice: Number(p.sellingPrice),
        costPrice: Number(p.costPrice),
      }));
      return data;
    },
  });
}

export function useCategories() {
  return useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/api/categories');
      return data;
    },
    staleTime: 1000 * 60 * 10, // 10 минут
  });
}
