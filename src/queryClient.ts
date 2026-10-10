import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from './api/client';
import type { InitialData } from './initialData';

export function createQueryClient(initial: InitialData | null): QueryClient {
  const handleUnauthorized = (error: unknown) => {
    // 401 with error_type (e.g. wrong password) falls through to the server message toast.
    if (error instanceof ApiError && error.status === 401 && !error.errorType) {
      toast.error('Nejsi přihlášen nebo nemáš oprávnění.');
      void queryClient.invalidateQueries({ queryKey: ['user'] });
      return true;
    }
    return false;
  };

  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: handleUnauthorized }),
    mutationCache: new MutationCache({
      onError: (error) => {
        if (handleUnauthorized(error)) return;
        toast.error(error instanceof Error ? error.message : 'Něco se pokazilo.');
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status < 500) && failureCount < 1,
      },
    },
  });

  if (initial) queryClient.setQueryData(['user'], initial.user);
  return queryClient;
}
