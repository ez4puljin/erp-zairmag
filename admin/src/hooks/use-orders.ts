'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Order, PaginatedResponse } from '@/types';

export function useOrders(params?: { page?: number; limit?: number; status?: string }) {
  return useQuery({
    queryKey: ['orders', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/api/orders', { params });
      return data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/api/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, driverId }: { id: string; status: string; driverId?: string }) => {
      const { data } = await api.patch(`/api/orders/${id}/status`, { status, driverId });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, cancellationNote }: { id: string; cancellationNote?: string }) => {
      const { data } = await api.patch(`/api/orders/${id}/cancel`, { cancellationNote });
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}
