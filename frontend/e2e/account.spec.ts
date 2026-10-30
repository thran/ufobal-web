import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { apiLogin, login, seed } from './fixtures';

const MAIL_DIR = new URL('./.mail/', import.meta.url);
const NEW_PASSWORD = 'Ufobal-e2e-2026';

/** The first link matching `path` in the newest e-mail sent to `to` (the server writes e-mails as files, see server.sh). */
async function mailLink(to: string, path: RegExp): Promise<string> {
  let link = '';
  await expect
    .poll(() => {
      if (!existsSync(MAIL_DIR)) return '';
      const mails = readdirSync(MAIL_DIR)
        .sort()
        .map((name) => readFileSync(new URL(name, MAIL_DIR), 'utf8'))
        .filter((mail) => mail.includes(`To: ${to}`));
      link = mails.at(-1)?.match(new RegExp(`http://\\S+${path.source}`))?.[0] ?? '';
      return link;
    })
    .toBeTruthy();
  return link;
}

const resetLink = (to: string) => mailLink(to, /\/reset-password\/\S+\/\S+/);

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

test('change e-mail through the link sent to the new address', async ({ page }) => {
  const account = seed().accounts.change; // its password is NEW_PASSWORD since the previous test
  const newEmail = 'e2e-change-new@example.cz';
  await login(page, { username: account.username, password: NEW_PASSWORD });
  await page.goto('/settings');
  await page.getByLabel('Nový e-mail').fill(newEmail);
  await page.getByRole('button', { name: 'Poslat potvrzovací odkaz' }).click();
  await expect(page.getByRole('status')).toContainText(`Na ${newEmail} jsme poslali odkaz`);

  await page.goto(await mailLink(newEmail, /\/confirm-email\/\S+/));
  await expect(page.getByText(`E-mail změněn na ${newEmail}`)).toBeVisible();
  await page.getByRole('link', { name: 'Zpět do nastavení' }).click();
  await expect(page.getByText(newEmail, { exact: true })).toBeVisible();
  expect(await apiLogin(page, newEmail, NEW_PASSWORD)).toBe(true);
  expect(await apiLogin(page, account.email, NEW_PASSWORD)).toBe(false);
});

test('disconnect Google once the account has a password', async ({ page }) => {
  const account = seed().accounts.google; // got a password in the reset test above
  await login(page, { username: account.username, password: NEW_PASSWORD });
  await page.goto('/settings');
  await expect(page.getByRole('list').getByText(account.email, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Odpojit Google' }).click();
  await expect(page.getByRole('button', { name: 'Propojit Google' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Propojit Facebook' })).toBeVisible();
});

test('Google login leaves for Google and a cancelled one comes back with a message', async ({ page }) => {
  await page.goto('/');
  const start = await page.request.get('/login/google-oauth2/?next=%2Fplayers', { maxRedirects: 0 });
  expect(start.status()).toBe(302);
  expect(start.headers().location).toContain('https://accounts.google.com/');
  expect(start.headers().location).toContain('redirect_uri=http://127.0.0.1:8123/complete/google-oauth2/');
  // what Google sends back when the user cancels
  await page.goto('/complete/google-oauth2/?error=access_denied');
  await expect(page).toHaveURL(/\/players$/);
  await expect(page.getByText('Přihlášení bylo zrušeno.')).toBeVisible();
});

test('registration works only after the link from the e-mail', async ({ page }) => {
  const email = 'e2e-novy@example.cz';
  await page.goto('/');
  await page.getByRole('button', { name: 'Přihlášení' }).click();
  await page.getByRole('menuitem', { name: /registrovat/ }).click();
  await page.getByLabel('Uživatelské jméno').fill('e2e-novy');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Heslo', { exact: true }).fill(NEW_PASSWORD);
  await page.getByLabel('Kontrola hesla').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Registrovat' }).click();
  await expect(page.getByRole('status')).toContainText(`na ${email} jsme poslali odkaz`);
  const link = await mailLink(email, /\/verify-email\/\S+/);

  // not usable before the confirmation
  await page.goto('/');
  await page.getByRole('button', { name: 'Přihlášení' }).click();
  await page.getByRole('menuitem', { name: /přes jméno/ }).click();
  await page.getByPlaceholder('jméno nebo e-mail').fill(email);
  await page.getByPlaceholder('heslo').fill(NEW_PASSWORD);
  await page.getByRole('button', { name: 'Přihlásit' }).click();
  await expect(page.getByText('E-mail tohoto účtu ještě není potvrzený.')).toBeVisible();

  await page.goto(link);
  await expect(page.getByText(/E-mail potvrzený, účet je aktivní/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'e2e-novy' })).toBeVisible();
});
