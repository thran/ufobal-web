import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getEmptyTournaments,
  getGoalieStats,
  getGoals,
  getGroups,
  getHallOfGlory,
  getMatches,
  getPairs,
  getPlayers,
  getRefereeFeedbacks,
  getStats,
  getTeamOnTournaments,
  getTournament,
} from '../api/endpoints';
import { buildGraphCached } from '../domain/graph';

const LIST_STALE = 10 * 60_000;

export const dataKeys = {
  players: ['players'] as const,
  tots: ['teamontournaments'] as const,
  goals: ['goals'] as const,
  emptyTournaments: ['emptyTournaments'] as const,
  tournament: (pk: number) => ['tournament', pk] as const,
  stats: ['stats'] as const,
  hallOfGlory: ['hallOfGlory'] as const,
  matches: (pk: number) => ['matches', pk] as const,
  pairs: (pk: number) => ['pairs', pk] as const,
  groups: (pk: number) => ['groups', pk] as const,
  goalieStats: (pk: number | 'all') => ['goalieStats', pk] as const,
  refereeFeedbacks: (pk: number) => ['refereeFeedbacks', pk] as const,
};

export function useGraph() {
  const [players, tots, goals, empty] = useQueries({
    queries: [
      { queryKey: dataKeys.players, queryFn: ({ signal }) => getPlayers(signal), staleTime: LIST_STALE },
      {
        queryKey: dataKeys.tots,
        queryFn: ({ signal }) => getTeamOnTournaments(signal),
        staleTime: LIST_STALE,
      },
      { queryKey: dataKeys.goals, queryFn: ({ signal }) => getGoals(signal), staleTime: LIST_STALE },
      {
        queryKey: dataKeys.emptyTournaments,
        queryFn: ({ signal }) => getEmptyTournaments(signal),
        staleTime: LIST_STALE,
      },
    ],
  });
  const graph = useMemo(
    () =>
      players.data && tots.data && goals.data && empty.data
        ? buildGraphCached({
            players: players.data,
            tots: tots.data,
            goals: goals.data,
            emptyTournaments: empty.data,
          })
        : undefined,
    [players.data, tots.data, goals.data, empty.data],
  );
  const failed = [players, tots, goals, empty].filter((q) => q.error);
  return {
    graph,
    error: graph ? null : (failed[0]?.error ?? null),
    isPending: !graph && failed.length === 0,
    isFetching: [players, tots, goals, empty].some((q) => q.isFetching),
    refetch: () => failed.forEach((q) => void q.refetch()),
  };
}

export const useStats = () =>
  useQuery({ queryKey: dataKeys.stats, queryFn: ({ signal }) => getStats(signal) });

export const useHallOfGlory = () =>
  useQuery({ queryKey: dataKeys.hallOfGlory, queryFn: ({ signal }) => getHallOfGlory(signal) });

export const useTournament = (pk: number | null) =>
  useQuery({
    queryKey: dataKeys.tournament(pk ?? 0),
    queryFn: ({ signal }) => getTournament(pk!, signal),
    enabled: pk != null,
  });

/** Aborts the request after `ms` and rejects with a readable error; the query's own signal still cancels it. */
export async function getMatchesWithTimeout(pk: number, signal: AbortSignal, ms: number) {
  const ctrl = new AbortController();
  const abort = () => ctrl.abort();
  if (signal.aborted) ctrl.abort();
  else signal.addEventListener('abort', abort);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, ms);
  try {
    return await getMatches(pk, ctrl.signal);
  } catch (err) {
    if (timedOut) throw new Error('Časový limit požadavku vypršel.');
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

export const useMatches = (
  pk: number,
  opts: { refetchInterval?: number | false; refetchOnMount?: boolean | 'always'; timeoutMs?: number } = {},
) =>
  useQuery({
    queryKey: dataKeys.matches(pk),
    queryFn: ({ signal }) =>
      opts.timeoutMs ? getMatchesWithTimeout(pk, signal, opts.timeoutMs) : getMatches(pk, signal),
    refetchInterval: opts.refetchInterval,
    refetchOnMount: opts.refetchOnMount,
  });

export const useRefereeFeedbacks = (pk: number) =>
  useQuery({
    queryKey: dataKeys.refereeFeedbacks(pk),
    queryFn: ({ signal }) => getRefereeFeedbacks(pk, signal),
    staleTime: 0,
  });

export const usePairs = (pk: number) =>
  useQuery({ queryKey: dataKeys.pairs(pk), queryFn: ({ signal }) => getPairs(pk, signal) });

export const useGroups = (pk: number) =>
  useQuery({ queryKey: dataKeys.groups(pk), queryFn: ({ signal }) => getGroups(pk, signal) });

export const useGoalieStats = (tournament?: number) =>
  useQuery({
    queryKey: dataKeys.goalieStats(tournament ?? 'all'),
    queryFn: ({ signal }) => getGoalieStats(tournament, signal),
    ...(tournament === undefined ? { staleTime: LIST_STALE } : {}),
  });
