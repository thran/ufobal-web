import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { apiLogin, login, seed } from './fixtures';

const MAIL_DIR = new URL('./.mail/', import.meta.url);
const NEW_PASSWORD = 'Ufobal-e2e-2026';

/** The reset link from the newest e-mail sent to `to` (the server writes e-mails as files, see server.sh). */
async function resetLink(to: string): Promise<string> {
  let link = '';
  await expect
    .poll(() => {
      if (!existsSync(MAIL_DIR)) return '';
      const mails = readdirSync(MAIL_DIR)
        .sort()
        .map((name) => readFileSync(new URL(name, MAIL_DIR), 'utf8'))
        .filter((mail) => mail.includes(`To: ${to}`));
      link = mails.at(-1)?.match(/http:\/\/\S+\/reset-password\/\S+\/\S+/)?.[0] ?? '';
      return link;
    })
    .toBeTruthy();
  return link;
}

async function requestReset(page: Page, email: string) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Přihlášení' }).click();
  await page.getByRole('menuitem', { name: /přes jméno/ }).click();
  await page.getByRole('button', { name: 'Zapomenuté heslo?' }).click();
  await page.getByLabel('e-mail').fill(email);
  await page.getByRole('button', { name: 'Poslat odkaz' }).click();
  await expect(page.getByRole('status')).toContainText('poslali jsme na něj odkaz');
}

async function setNewPassword(page: Page, link: string, username: string) {
  await page.goto(link);
  await expect(page.getByText(username, { exact: true })).toBeVisible();
  await page.getByLabel('Nové heslo', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Nové heslo znovu').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Nastavit heslo' }).click();
  await expect(page).toHaveURL(/\/settings$/);
}

test('forgotten password: e-mail link sets a new one, then log in by e-mail', async ({ page }) => {
  const account = seed().accounts.reset;
  await requestReset(page, account.email);
  const link = await resetLink(account.email);
  await setNewPassword(page, link, account.username);
  await expect(page.getByRole('heading', { name: 'Změna hesla' })).toBeVisible();

  // the link works only once
  await page.goto(link);
  await expect(page.getByRole('alert')).toContainText('neplatný');

  // log out, then log in through the dialog with the e-mail in other case and the new password
  await page.getByRole('button', { name: `Účet ${account.username}` }).click();
  await page.getByRole('menuitem', { name: 'Odhlásit se' }).click();
  await page.getByRole('button', { name: 'Přihlášení' }).click();
  await page.getByRole('menuitem', { name: /přes jméno/ }).click();
  await page.getByPlaceholder('jméno nebo e-mail').fill(account.email.toUpperCase());
  await page.getByPlaceholder('heslo').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Přihlásit' }).click();
  await expect(page.getByRole('button', { name: `Účet ${account.username}` })).toBeVisible();
  expect(await apiLogin(page, account.username, account.password!)).toBe(false);
});

test('Google-only account sets its first password through the reset link', async ({ page }) => {
  const account = seed().accounts.google;
  await requestReset(page, account.email);
  await setNewPassword(page, await resetLink(account.email), account.username);
  // with a password the settings ask for the current one when changing it
  await expect(page.getByRole('heading', { name: 'Změna hesla' })).toBeVisible();
  await expect(page.getByLabel('Současné heslo')).toBeVisible();
});

test('change password in settings', async ({ page }) => {
  const account = seed().accounts.change;
  await login(page, { username: account.username, password: account.password! });
  await page.goto('/settings');
  await page.getByLabel('Současné heslo').fill('spatne-heslo');
  await page.getByLabel('Nové heslo', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Nové heslo znovu').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Změnit heslo' }).click();
  await expect(page.getByText('Vaše současné heslo nebylo zadáno správně.', { exact: false })).toBeVisible();

  await page.getByLabel('Současné heslo').fill(account.password!);
  await page.getByRole('button', { name: 'Změnit heslo' }).click();
  await expect(page.getByText('Heslo změněno.')).toBeVisible();
  // still logged in after the change, and only the new password works
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Nastavení účtu' })).toBeVisible();
  expect(await apiLogin(page, account.username, account.password!)).toBe(false);
  expect(await apiLogin(page, account.email, NEW_PASSWORD)).toBe(true);
});
