import { readFileSync } from 'node:fs';
import { expect, type Page } from '@playwright/test';

export interface Seed {
  tournament: number;
  recordMatch: number;
  viewMatch: number;
  user: { username: string; password: string };
  players: Record<string, number>;
}

/** Reads the seed written by `seed_e2e` when the web server started. */
export function seed(): Seed {
  return JSON.parse(readFileSync(new URL('./.seed.json', import.meta.url), 'utf8')) as Seed;
}

/** Logs in through the API; the session cookie lands in the page's browser context. */
export async function login(page: Page): Promise<void> {
  await page.goto('/');
  const token = (await page.context().cookies()).find((c) => c.name === 'csrftoken')?.value;
  expect(token).toBeTruthy();
  const { username, password } = seed().user;
  const res = await page.request.post('/api_frontend/login', {
    data: { username, password },
    headers: { 'X-CSRFToken': token! },
  });
  expect(res.ok()).toBe(true);
}
