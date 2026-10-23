import type { User } from './api/types';

export interface InitialData {
  user: User | null;
  liveTournamentPk: number | null;
  test: boolean;
}

export function readInitialData(doc: Document = document): InitialData | null {
  const text = doc.getElementById('initial-data')?.textContent;
  if (!text) return null;
  try {
    return JSON.parse(text) as InitialData;
  } catch {
    return null;
  }
}
