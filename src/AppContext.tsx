import { createContext, useContext, type ReactNode } from 'react';

export interface AppConfig {
  liveTournamentPk: number | null;
  test: boolean;
}

const AppConfigContext = createContext<AppConfig>({ liveTournamentPk: null, test: false });

export function AppConfigProvider({ value, children }: { value: AppConfig; children: ReactNode }) {
  return <AppConfigContext.Provider value={value}>{children}</AppConfigContext.Provider>;
}

export const useAppConfig = () => useContext(AppConfigContext);
