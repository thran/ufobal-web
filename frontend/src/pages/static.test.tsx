import { screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { tournamentDto } from '../test/fixtures';
import { mockApi, renderWithProviders } from '../test/utils';
import FaqPage from './FaqPage';
import HomePage from './HomePage';
import PrivacyPolicyPage from './PrivacyPolicyPage';

const stats = {
  tournament_count: 42,
  max_year: 2026,
  min_year: 2005,
  player_count: 1234,
  player_male_count: 800,
  player_female_count: 400,
  team_count: 120,
  team_on_tournament_count: 900,
  goals: 12345,
  assists: 6789,
  active_players: 321,
  active_players_year: 2025,
};

test('home shows stats with Czech number format', async () => {
  mockApi({ stats });
  renderWithProviders(<HomePage />);
  expect(await screen.findByText(/turnajů od roku/)).toHaveTextContent(
    '42 turnajů od roku 2005 až do roku 2026',
  );
  expect(screen.getByText(/gólů a/)).toHaveTextContent(/12\s345 gólů a 6\s789 asistencí/u);
  expect(screen.getByRole('link', { name: 'Stručný návod na zapisování zápasu' })).toHaveAttribute(
    'href',
    '/static/záznam_zápasu.pdf',
  );
});

test('home shows live tournament with registration link', async () => {
  mockApi({
    stats,
    'tournament/7': tournamentDto({
      pk: 7,
      full_name: 'Brno 2026',
      date: '2026-06-13',
      registration_open: true,
      registration_to: '2026-06-01',
      description: '<p>Popis <b>turnaje</b></p>',
    }),
  });
  renderWithProviders(<HomePage />, { config: { liveTournamentPk: 7 } });
  expect(await screen.findByRole('link', { name: 'Brno 2026' })).toHaveAttribute(
    'href',
    '/tournaments/7/record',
  );
  expect(screen.getByText('datum: 13. 6. 2026')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'přihlásit se na turnaj' })).toHaveAttribute(
    'href',
    '/tournaments/7/register',
  );
  expect(screen.getByText(/do 1\. 6\. 2026/)).toBeInTheDocument();
  expect(screen.getByText('turnaje').tagName).toBe('B');
});

test('home stats error shows retry box', async () => {
  mockApi({});
  renderWithProviders(<HomePage />);
  expect(await screen.findByRole('alert')).toBeInTheDocument();
});

test('faq has its sections', () => {
  renderWithProviders(<FaqPage />);
  expect(screen.getByRole('heading', { name: 'Co a jak?' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Často kladené dotazy' })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Můžu něco pokazit?' })).toBeInTheDocument();
});

test('privacy policy renders', () => {
  renderWithProviders(<PrivacyPolicyPage />);
  expect(screen.getByRole('heading', { name: 'Privacy Policy for UfoIS' })).toBeInTheDocument();
});
