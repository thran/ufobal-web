import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export interface Seed {
  tournament: number;
  recordMatch: number;
  viewMatch: number;
  user: { username: string; password: string };
  accounts: Record<
    'reset' | 'google' | 'change',
    { username: string; email: string; password: string | null }
  >;
  players: Record<string, number>;
}

/** Reads the seed written by `seed_e2e` when the web server started. */
export function seed(): Seed {
  return JSON.parse(readFileSync(new URL('./.seed.json', import.meta.url), 'utf8')) as Seed;
}

/** Logs in through the API; the session cookie lands in the page's browser context. */
export async function login(page: Page, credentials = seed().user): Promise<void> {
  await page.goto('/');
  expect(await apiLogin(page, credentials.username, credentials.password)).toBe(true);
}

/** Tries a password login through the API (on an already opened page); returns whether it succeeded. */
export async function apiLogin(page: Page, username: string, password: string): Promise<boolean> {
  const token = (await page.context().cookies()).find((c) => c.name === 'csrftoken')?.value;
  expect(token).toBeTruthy();
  const res = await page.request.post('/api_frontend/login', {
    data: { username, password },
    headers: { 'X-CSRFToken': token! },
  });
  return res.ok();
}
