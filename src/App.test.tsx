import { render, screen } from '@testing-library/react';
import App from './App';

test('renders home', async () => {
  render(<App initial={{ user: null, liveTournamentPk: null, test: false }} />);
  expect(await screen.findByRole('heading', { name: 'Ufo-IS' })).toBeInTheDocument();
});
