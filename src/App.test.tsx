import { render, screen } from '@testing-library/react';
import App from './App';
import { mockApi } from './test/utils';

test('renders home', async () => {
  mockApi({});
  render(<App initial={{ user: null, liveTournamentPk: null, test: false }} />);
  expect(await screen.findByRole('heading', { name: 'Ufobalový Informační Systém' })).toBeInTheDocument();
});
