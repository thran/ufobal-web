import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import * as authApi from '../api/auth';
import type { User } from '../api/types';

export const userQueryKey = ['user'] as const;
export const accountQueryKey = ['account'] as const;

export function useUser() {
  return useQuery({ queryKey: userQueryKey, queryFn: authApi.getUserProfile, staleTime: Infinity });
}

function setUserAndRefreshRest(qc: QueryClient, user: User | null) {
  qc.setQueryData(userQueryKey, user);
  // Responses differ for staff (e.g. birthdate), so everything else is refetched, except one-time links from
  // e-mails (meta.once): those must not be sent again.
  void qc.invalidateQueries({ predicate: (q) => q.queryKey[0] !== userQueryKey[0] && !q.meta?.once });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.login, onSuccess: (user) => setUserAndRefreshRest(qc, user) });
}

/** Registers without logging in: the account works once the link sent to its e-mail is opened. */
export function useSignup() {
  return useMutation({ mutationFn: authApi.signup });
}

export function useResendVerification() {
  return useMutation({ mutationFn: authApi.resendVerification });
}

/** Logs in with the user the confirmed e-mail link returned. */
export function useSetLoggedInUser() {
  const qc = useQueryClient();
  return (user: User) => setUserAndRefreshRest(qc, user);
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: authApi.logout, onSuccess: () => setUserAndRefreshRest(qc, null) });
}

export function useRequestPasswordReset() {
  return useMutation({ mutationFn: authApi.requestPasswordReset });
}

export function useConfirmPasswordReset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.confirmPasswordReset,
    onSuccess: (user) => setUserAndRefreshRest(qc, user),
  });
}

export function useChangePassword() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: (user) => {
      qc.setQueryData(userQueryKey, user);
      void qc.invalidateQueries({ queryKey: accountQueryKey });
    },
  });
}

export type SocialProvider = 'google-oauth2' | 'facebook';

/**
 * Leaves for Google/Facebook and comes back to `next` (the current page by default). A logged-in user connects
 * the provider to the account. A full-page redirect rather than a popup: popups do not work in installed apps.
 */
export function startSocialLogin(
  provider: SocialProvider,
  next = window.location.pathname + window.location.search,
) {
  window.location.assign(`/login/${provider}/?next=${encodeURIComponent(next)}`);
}

const LOGIN_ERRORS: Record<string, string> = {
  cancelled: 'Přihlášení bylo zrušeno.',
  email_exists:
    'Účet s tímto e-mailem nejde propojit automaticky. Přihlas se do něj jménem nebo e-mailem a heslem (případně přes „Zapomenuté heslo“) a Google nebo Facebook si pak připoj v Nastavení účtu.',
  already_linked: 'Tento účet Google nebo Facebook už je propojený s jiným účtem v ISu.',
  inactive: 'Tento účet je deaktivovaný.',
  failed: 'Přihlášení se nepovedlo, zkus to znovu.',
};

/** Shows why a Google/Facebook login failed (the backend comes back with ?login_error=<code>) and drops the param. */
export function useLoginErrorNotice() {
  const [params, setParams] = useSearchParams();
  const code = params.get('login_error');
  useEffect(() => {
    if (!code) return;
    toast.error(LOGIN_ERRORS[code] ?? LOGIN_ERRORS.failed, { id: 'login-error', duration: 10_000, closeButton: true });
    setParams(
      (current) => {
        current.delete('login_error');
        return current;
      },
      { replace: true },
    );
  }, [code, setParams]);
}
