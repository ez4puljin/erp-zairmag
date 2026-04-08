'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { login as loginFn, logout as logoutFn, getProfile, isAuthenticated } from '@/lib/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  const hasToken = clientReady && isAuthenticated();

  const { data: user, isLoading: queryLoading, isError } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: getProfile,
    enabled: hasToken,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // isLoading logic:
  // - Client not ready yet → true (wait for hydration)
  // - Client ready, has token, query loading → true (fetching profile)
  // - Client ready, has token, query error → false (failed)
  // - Client ready, no token → false (go to login)
  // - Client ready, has user → false (done)
  let isLoading: boolean;
  if (!clientReady) {
    isLoading = true; // Wait for client hydration
  } else if (!hasToken) {
    isLoading = false; // No token, not loading
  } else if (queryLoading && !isError) {
    isLoading = true; // Fetching profile
  } else {
    isLoading = false;
  }

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      loginFn(email, password),
    onSuccess: () => {
      // Full page reload to ensure clean state with new token
      window.location.href = '/';
    },
  });

  const logoutMutation = useMutation({
    mutationFn: logoutFn,
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  return {
    user,
    isLoading,
    login: loginMutation,
    logout: logoutMutation,
    isAuthenticated: !!user,
  };
}
