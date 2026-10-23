import { useMutation, useQueryClient, type QueryClient, type QueryKey } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiError } from '../api/client';
import * as ep from '../api/endpoints';
import { userQueryKey } from '../auth/user';
import { dataKeys } from './data';

function useWrite<V, R>(
  fn: (v: V) => Promise<R>,
  opts: { invalidate: (v: V, r: R) => QueryKey[]; success?: string },
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    // Returned promise keeps the mutation pending until active queries are refetched.
    onSuccess: (r, v) => {
      if (opts.success) toast.success(opts.success);
      return Promise.all(opts.invalidate(v, r).map((queryKey) => qc.invalidateQueries({ queryKey })));
    },
  });
}

export const useAddTeam = () => useWrite(ep.addTeam, { invalidate: () => [], success: 'Tým vytvořen.' });
export const useRegisterTeam = () =>
  useWrite(ep.addTeamOnTournament, {
    invalidate: (v) => [dataKeys.tots, dataKeys.emptyTournaments, dataKeys.tournament(v.tournament)],
    success: 'Tým přihlášen.',
  });
export const useAddPlayer = () =>
  useWrite(ep.addPlayer, { invalidate: () => [dataKeys.players], success: 'Hráč vytvořen.' });
export const useAddAttendance = () =>
  useWrite(ep.addAttendance, { invalidate: () => [dataKeys.tots], success: 'Hráč přidán.' });
export const useRemoveAttendance = () =>
  useWrite(ep.removeAttendance, { invalidate: () => [dataKeys.tots], success: 'Hráč odebrán.' });
export const useSetCaptain = () =>
  useWrite(ep.setCaptain, { invalidate: () => [dataKeys.tots], success: 'Uloženo.' });
export const useSetDefaultGoalie = () =>
  useWrite(ep.setDefaultGoalie, { invalidate: () => [dataKeys.tots], success: 'Uloženo.' });
export const useSavePlayer = () =>
  useWrite(ep.savePlayer, { invalidate: () => [dataKeys.players, userQueryKey], success: 'Uloženo.' });
export const useAddMatch = () =>
  useWrite(ep.addMatch, { invalidate: (v) => [dataKeys.matches(v.tournament)], success: 'Zápas vytvořen.' });
export const useCreatePairingRequest = () =>
  useWrite(ep.createPairingRequest, { invalidate: () => [], success: 'Žádost o spárování odeslána.' });
export const useSaveRefereeFeedback = (tournament: number) =>
  useWrite(ep.saveRefereeFeedback, {
    invalidate: () => [dataKeys.refereeFeedbacks(tournament)],
    success: 'Hodnocení uloženo.',
  });

/** Pairing changes the user's permissions, so everything is refetched. */
export function usePairUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ep.pairUser,
    onSuccess: () => {
      toast.success('Účet spárován.');
      return qc.invalidateQueries();
    },
  });
}

export function invalidateMatchData(qc: QueryClient, tournament: number) {
  return Promise.all(
    [
      dataKeys.matches(tournament),
      dataKeys.pairs(tournament),
      dataKeys.groups(tournament),
      dataKeys.goalieStats(tournament),
      dataKeys.goalieStats('all'),
      dataKeys.goals,
    ].map((queryKey) => qc.invalidateQueries({ queryKey })),
  );
}
export const useRemoveMatchEvent = (tournament: number) => {
  const qc = useQueryClient();
  return useMutation({
    // Already deleted (e.g. by a retried request or another device) counts as success.
    mutationFn: (v: { type: 'goal' | 'shot' | 'penalty'; pk: number }) =>
      ep.removeMatchEvent(v.type, v.pk).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) return 'OK';
        throw err;
      }),
    onSuccess: () => invalidateMatchData(qc, tournament),
  });
};
