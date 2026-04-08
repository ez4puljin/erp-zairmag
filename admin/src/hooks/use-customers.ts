'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Customer, PaginatedResponse } from '@/types';

export function useCustomers(params?: { page?: number; limit?: number; search?: string; pricingTier?: string }) {
  return useQuery({
    queryKey: ['customers', params],
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Customer>>('/api/customers', { params });
      return data;
    },
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customers', id],
    queryFn: async () => {
      const { data } = await api.get<Customer>(`/api/customers/${id}`);
      return data;
    },
    enabled: !!id,
  });
}

export function useCustomerBalance(id: string) {
  return useQuery({
    queryKey: ['customers', id, 'balance'],
    queryFn: async () => {
      const { data } = await api.get<{ creditLimit: number; outstandingDebt: number; availableCredit: number }>(
        `/api/customers/${id}/balance`
      );
      return data;
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data } = await api.post('/api/customers', customer);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...customer }: Partial<Customer> & { id: string }) => {
      const { data } = await api.patch(`/api/customers/${id}`, customer);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}
