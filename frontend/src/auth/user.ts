import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import * as authApi from '../api/auth';
import type { User } from '../api/types';

export const userQueryKey = ['user'] as const;
export const SOCIAL_LOGIN_MESSAGE = 'ufo-social-login';

export function useUser() {
  return useQuery({ queryKey: userQueryKey, queryFn: authApi.getUserProfile, staleTime: Infinity });
}

function setUserAndRefreshRest(qc: QueryClient, user: User | null) {
  qc.setQueryData(userQueryKey, user);
  // Responses differ for managers (e.g. birthdate), so everything else is refetched.
  void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== userQueryKey[0] });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.login, onSuccess: (user) => setUserAndRefreshRest(qc, user) });
}

export function useSignup() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.signup, onSuccess: (user) => setUserAndRefreshRest(qc, user) });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.logout, onSuccess: () => setUserAndRefreshRest(qc, null) });
}

export function openSocialLogin(provider: 'google-oauth2' | 'facebook') {
  window.open(
    `/login/${provider}/?next=/login/close_login_popup`,
    'popup',
    'height=700,width=700,left=100,top=100,resizable=yes,scrollbars=yes,toolbar=no,menubar=no,location=yes',
  );
}

export function useSocialLoginListener() {
  const qc = useQueryClient();
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin || e.data?.type !== SOCIAL_LOGIN_MESSAGE) return;
      void qc.invalidateQueries();
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [qc]);
}
