import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as authApi from '../api/auth';
import { accountQueryKey } from './user';

export function useAccount() {
  return useQuery({ queryKey: accountQueryKey, queryFn: authApi.getAccount });
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
