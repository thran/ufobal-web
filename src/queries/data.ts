import { useQueries, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  getEmptyTournaments,
  getGoals,
  getHallOfGlory,
  getPlayers,
  getStats,
  getTeamOnTournaments,
  getTournament,
} from '../api/endpoints';
import { buildGraph } from '../domain/graph';

const LIST_STALE = 10 * 60_000;

export const dataKeys = {
  players: ['players'] as const,
  tots: ['teamontournaments'] as const,
  goals: ['goals'] as const,
  emptyTournaments: ['emptyTournaments'] as const,
  tournament: (pk: number) => ['tournament', pk] as const,
  stats: ['stats'] as const,
  hallOfGlory: ['hallOfGlory'] as const,
};

export function useGraph() {
  const [players, tots, goals, empty] = useQueries({
    queries: [
      { queryKey: dataKeys.players, queryFn: ({ signal }) => getPlayers(signal), staleTime: LIST_STALE },
      { queryKey: dataKeys.tots, queryFn: ({ signal }) => getTeamOnTournaments(signal), staleTime: LIST_STALE },
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
        ? buildGraph({ players: players.data, tots: tots.data, goals: goals.data, emptyTournaments: empty.data })
        : undefined,
    [players.data, tots.data, goals.data, empty.data],
  );
  const failed = [players, tots, goals, empty].filter((q) => q.error);
  return {
    graph,
    error: failed[0]?.error ?? null,
    isPending: !graph && failed.length === 0,
    refetch: () => failed.forEach((q) => void q.refetch()),
  };
}

export const useStats = () => useQuery({ queryKey: dataKeys.stats, queryFn: ({ signal }) => getStats(signal) });

export const useHallOfGlory = () =>
  useQuery({ queryKey: dataKeys.hallOfGlory, queryFn: ({ signal }) => getHallOfGlory(signal) });

export const useTournament = (pk: number | null) =>
  useQuery({
    queryKey: dataKeys.tournament(pk ?? 0),
    queryFn: ({ signal }) => getTournament(pk!, signal),
    enabled: pk != null,
  });
