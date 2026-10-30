import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { accountQueryKey, userQueryKey } from './user';

export function useAccount() {
  return useQuery({ queryKey: accountQueryKey, queryFn: authApi.getAccount });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateAccount,
    onSuccess: (account) => {
      qc.setQueryData(accountQueryKey, account);
      // the name in the top bar comes from the user profile
      void qc.invalidateQueries({ queryKey: userQueryKey });
    },
  });
}

export function useRequestEmailChange() {
  return useMutation({ mutationFn: authApi.requestEmailChange });
}

export function useDisconnectSocial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.disconnectSocial,
    onSuccess: (account) => qc.setQueryData(accountQueryKey, account),
  });
}
