import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { AppConfigProvider } from './AppContext';
import { readInitialData, type InitialData } from './initialData';
import { createQueryClient } from './queryClient';
import { routes } from './router';

export default function App({ initial = readInitialData() }: { initial?: InitialData | null }) {
  const [queryClient] = useState(() => createQueryClient(initial));
  const [router] = useState(() => createBrowserRouter(routes));
  return (
    <QueryClientProvider client={queryClient}>
      <AppConfigProvider value={{ liveTournamentPk: initial?.liveTournamentPk ?? null, test: initial?.test ?? false }}>
        <RouterProvider router={router} />
      </AppConfigProvider>
    </QueryClientProvider>
  );
}
