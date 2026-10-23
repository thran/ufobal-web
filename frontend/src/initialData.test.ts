import { expect, test } from 'vitest';
import { readInitialData } from './initialData';

function docWith(content: string | null): Document {
  const doc = document.implementation.createHTMLDocument();
  if (content !== null) {
    const el = doc.createElement('script');
    el.id = 'initial-data';
    el.type = 'application/json';
    el.textContent = content;
    doc.head.appendChild(el);
  }
  return doc;
}

test('reads injected JSON', () => {
  const data = { user: null, liveTournamentPk: 5, test: true };
  expect(readInitialData(docWith(JSON.stringify(data)))).toEqual(data);
});

test('returns null for raw Django placeholder (Vite dev server)', () => {
  expect(readInitialData(docWith('{{ initial_json|safe }}'))).toBeNull();
});

test('returns null when element is missing', () => {
  expect(readInitialData(docWith(null))).toBeNull();
});
