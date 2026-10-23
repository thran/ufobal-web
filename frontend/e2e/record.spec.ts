import { expect, test, type Page } from '@playwright/test';
import { login, seed } from './fixtures';

const editUrl = () => {
  const s = seed();
  return `/tournaments/${s.tournament}/matches/${s.recordMatch}/edit`;
};

test('record page requires login', async ({ page }) => {
  await page.goto(editUrl());
  await expect(page.getByRole('alert')).toContainText('Pro tuto stránku se musíš přihlásit.');
});

test('record hub lists the match', async ({ page }) => {
  const s = seed();
  await login(page);
  await page.goto(`/tournaments/${s.tournament}/record`);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('E2E turnaj');
  await expect(page.getByRole('heading', { level: 3, name: 'Zápasy' })).toBeVisible();
  await expect(
    page.locator(`a[href$="/matches/${s.recordMatch}/edit"], a[href$="/matches/${s.recordMatch}"]`).first(),
  ).toBeVisible();
});

// The clock state lives in the browser's localStorage, so both tests share one page.
test.describe.serial('live recording', () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await (await browser.newContext()).newPage();
    await login(page);
  });

  test.afterAll(async () => {
    await page.context().close();
  });

  test('kick off and record a goal', async () => {
    const s = seed();
    await page.goto(editUrl());
    await page.getByRole('button', { name: 'Spustit čas' }).click();
    await expect(page.getByText('Začít zápas?')).toBeVisible();
    await page.getByRole('button', { name: 'Ano' }).click();
    await expect(page.getByText('1. poločas').first()).toBeVisible();

    await page.getByRole('button', { name: 'Gól Draci' }).click();
    await expect(page.getByText('Gól - Draci - střelec')).toBeVisible();
    await page.getByRole('button', { name: 'Beta' }).click();
    await expect(page.getByText('Gól - Draci - asistence')).toBeVisible();
    await page.getByRole('button', { name: 'nikdo' }).click();
    await expect(page.getByText('Gól - Draci - asistence')).toHaveCount(0);
    await expect(page.getByRole('status')).toHaveText('Vše uloženo');

    await page.goto(`/tournaments/${s.tournament}/matches/${s.recordMatch}`);
    await expect(page.getByTestId('goals-left')).toHaveText('1');
    await expect(page.getByTestId('goals-right')).toHaveText('0');
    await expect(page.getByTestId('events-desktop')).toContainText('Beta');
  });

  test('shot survives reload without duplicates', async () => {
    await page.goto(editUrl());
    await expect(page.getByRole('button', { name: 'Zastavit čas' })).toBeVisible();
    await page.getByRole('button', { name: 'Střela Sovy' }).click();
    await expect(page.getByRole('status')).toHaveText('Vše uloženo');
    await expect(page.getByTestId('stats-right')).toHaveText('0% - 1');
    await page.getByRole('checkbox', { name: 'střely' }).check();
    await expect(page.getByTestId('events-desktop').getByText('střela')).toHaveCount(1);

    await page.reload();
    await expect(page.getByRole('button', { name: 'Zastavit čas' })).toBeVisible();
    await expect(page.getByTestId('stats-right')).toHaveText('0% - 1');
    await page.getByRole('checkbox', { name: 'střely' }).check();
    await expect(page.getByTestId('events-desktop').getByText('střela')).toHaveCount(1);
  });
});
