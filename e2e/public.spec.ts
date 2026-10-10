import { expect, test } from '@playwright/test';
import { seed } from './fixtures';

test('home page', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Ufobalový Informační Systém' })).toBeVisible();
  await expect(page.getByText('V systému je aktuálně:')).toBeVisible();
});

test('tournaments list', async ({ page }) => {
  await page.goto('/tournaments');
  await expect(page.getByRole('heading', { level: 1, name: 'Turnaje' })).toBeVisible();
  await expect(page.getByRole('link', { name: /E2E turnaj/ }).first()).toBeVisible();
});

test('players list and detail', async ({ page }) => {
  await page.goto('/players');
  await expect(page.getByRole('heading', { level: 1, name: 'Hráči' })).toBeVisible();
  await page.getByPlaceholder('hledat...').fill('Beta');
  await expect(page.getByRole('link', { name: 'Alfa' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Beta' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Beta' })).toBeVisible();
});

test('tournament results', async ({ page }) => {
  await page.goto(`/tournaments/${seed().tournament}/results`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E turnaj');
  const players = page.getByRole('table').filter({ has: page.getByRole('columnheader', { name: 'kanada' }) });
  const row = players.getByRole('row', { name: /Beta/ });
  await expect(row).toHaveCount(1);
  // columns: rank, name, goals, assists, canada
  await expect(row.getByRole('cell').nth(2)).toHaveText('1');
});

test('match view', async ({ page }) => {
  const s = seed();
  await page.goto(`/tournaments/${s.tournament}/matches/${s.viewMatch}`);
  await expect(page.getByTestId('events-desktop')).toContainText('Beta');
  // team one (Draci) is the left side
  await expect(page.getByTestId('goals-left')).toHaveText('1');
  await expect(page.getByTestId('goals-right')).toHaveText('0');
  await expect(page.getByRole('button', { name: 'Přihlášení' })).toBeVisible();
  await expect(page.getByText('Zaznamenávat')).toHaveCount(0);
});

test('not found', async ({ page }) => {
  await page.goto('/nope');
  await expect(page.getByText('Stránka nenalezena')).toBeVisible();
});

test.describe('legacy redirects', () => {
  test('/hraci', async ({ page }) => {
    await page.goto('/hraci');
    await expect(page).toHaveURL(/\/players$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Hráči' })).toBeVisible();
  });

  test('/turnaj-zive/:t', async ({ page }) => {
    const t = seed().tournament;
    await page.goto(`/turnaj-zive/${t}`);
    await expect(page).toHaveURL(new RegExp(`/tournaments/${t}/live$`));
    await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E turnaj');
  });

  test('/turnaj/zapas/:t/:m', async ({ page }) => {
    const { tournament: t, viewMatch: m } = seed();
    await page.goto(`/turnaj/zapas/${t}/${m}`);
    await expect(page).toHaveURL(new RegExp(`/tournaments/${t}/matches/${m}$`));
    await expect(page.getByTestId('events-desktop')).toContainText('Beta');
  });
});

test('old app is still served', async ({ page }) => {
  const res = await page.goto('/old/');
  expect(res?.status()).toBe(200);
  await expect(page.locator('body[ng-app="ufoIS"]')).toHaveCount(1);
});
