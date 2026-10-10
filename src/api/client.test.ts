import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { api, ApiError, getCookie } from './client';

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  document.cookie = 'csrftoken=tok123';
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
});

const respond = (status: number, body: string) =>
  fetchMock.mockResolvedValueOnce(new Response(body, { status }));

test('getCookie reads a cookie', () => {
  expect(getCookie('csrftoken')).toBe('tok123');
  expect(getCookie('missing')).toBeNull();
});

test('GET prefixes path and parses JSON, without CSRF header', async () => {
  respond(200, '[{"pk":1}]');
  await expect(api('players')).resolves.toEqual([{ pk: 1 }]);
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/players');
  expect(init.method).toBe('GET');
  expect(init.credentials).toBe('same-origin');
  expect(init.headers['X-CSRFToken']).toBeUndefined();
});

test('POST sends JSON body and CSRF token', async () => {
  respond(200, '{"ok":true}');
  await api('login', { method: 'POST', body: { username: 'a' } });
  const [, init] = fetchMock.mock.calls[0];
  expect(init.headers['X-CSRFToken']).toBe('tok123');
  expect(init.headers['Content-Type']).toBe('application/json');
  expect(init.body).toBe('{"username":"a"}');
});

test('JSON null body resolves to null (anonymous user_profile)', async () => {
  respond(200, 'null');
  await expect(api('user_profile')).resolves.toBeNull();
});

test('plain text success body (logout 202 "ok") resolves to text', async () => {
  respond(202, 'ok');
  await expect(api('logout', { method: 'POST' })).resolves.toBe('ok');
});

test('JSON error becomes ApiError with message and type', async () => {
  respond(401, '{"error":"Špatné jméno nebo heslo.","error_type":"password_username_not_match"}');
  const err = (await api('login', { method: 'POST', body: {} }).catch((e) => e)) as ApiError;
  expect(err).toBeInstanceOf(ApiError);
  expect(err.status).toBe(401);
  expect(err.message).toBe('Špatné jméno nebo heslo.');
  expect(err.errorType).toBe('password_username_not_match');
});

test('plain text error becomes ApiError with text message', async () => {
  respond(400, 'Nejsi v žádném týmu');
  const err = (await api('get_referee_feedbacks/1').catch((e) => e)) as ApiError;
  expect(err.status).toBe(400);
  expect(err.message).toBe('Nejsi v žádném týmu');
  expect(err.errorType).toBeNull();
});

test('params are encoded into the query string, undefined skipped; signal is passed', async () => {
  respond(200, '[]');
  const controller = new AbortController();
  await api('matchs', { params: { tournament: 5, x: undefined, q: 'á b' }, signal: controller.signal });
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('/api_frontend/matchs?tournament=5&q=%C3%A1+b');
  expect(init.signal).toBe(controller.signal);
});

test('HTML error body becomes a generic message', async () => {
  respond(404, '<!doctype html><title>Not Found</title>');
  const err = (await api('x').catch((e) => e)) as ApiError;
  expect(err.status).toBe(404);
  expect(err.message).toBe('Požadavek se nezdařil.');
});
