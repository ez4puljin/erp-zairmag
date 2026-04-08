import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import api from '../lib/api';
import type { Order, PaginatedResponse } from '../types';

export function useMyOrders() {
  return useQuery<PaginatedResponse<Order>>({
    queryKey: ['orders', 'my'],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Order>>('/api/orders');
      return data;
    },
  });
}

export function useOrder(id: string) {
  return useQuery<Order>({
    queryKey: ['orders', id],
    queryFn: async () => {
      const { data } = await api.get<Order>(`/api/orders/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      items: Array<{ productId: string; quantity: number }>,
    ) => {
      const { data } = await api.post<Order>('/api/orders', { items });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Захиалга үүсгэхэд алдаа гарлаа';
      Alert.alert('Алдаа', message);
    },
  });
}

// Customer requests cancellation → awaits manager approval
export function useRequestCancel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      note,
    }: {
      orderId: string;
      note?: string;
    }) => {
      const { data } = await api.patch<Order>(
        `/api/orders/${orderId}/request-cancel`,
        { cancellationNote: note },
      );
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.setQueryData(['orders', data.id], data);
      Alert.alert(
        'Хүсэлт илгээгдлээ',
        'Цуцлах хүсэлт менежер рүү илгээгдлээ. Менежер тантай холбогдож баталгаажуулсны дараа захиалга цуцлагдана.',
      );
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || 'Цуцлах хүсэлт илгээхэд алдаа гарлаа';
      Alert.alert('Алдаа', message);
    },
  });
}
