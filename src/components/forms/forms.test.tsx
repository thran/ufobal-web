import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import { buildGraph, type PlayerVM } from '../../domain/graph';
import { sampleRaw } from '../../test/fixtures';
import BirthdateAgeInput from './BirthdateAgeInput';
import GenderSelect from './GenderSelect';
import PlayerCombobox from './PlayerCombobox';

test('GenderSelect maps values', async () => {
  function Harness() {
    const [v, setV] = useState<'man' | 'woman' | null>(null);
    return (
      <>
        <GenderSelect value={v} onChange={setV} />
        <output>{String(v)}</output>
      </>
    );
  }
  render(<Harness />);
  await userEvent.selectOptions(screen.getByRole('combobox'), 'žena');
  expect(screen.getByRole('status')).toHaveTextContent('woman');
});

test('BirthdateAgeInput shows computed age', () => {
  render(<BirthdateAgeInput value="2000-01-01" onChange={() => {}} idPrefix="p" />);
  expect(screen.getByLabelText('Datum narození')).toHaveValue('2000-01-01');
  expect(Number((screen.getByLabelText('Věk') as HTMLInputElement).value)).toBeGreaterThanOrEqual(25);
});

test('PlayerCombobox searches without diacritics and excludes pks', async () => {
  const players = buildGraph(sampleRaw()).players;
  function Harness() {
    const [p, setP] = useState<PlayerVM | null>(null);
    return (
      <>
        <PlayerCombobox players={players} value={p} onChange={setP} label="Hráč" exclude={new Set([101])} />
        <span data-testid="sel">{p?.nickname ?? ''}</span>
      </>
    );
  }
  render(<Harness />);
  const input = screen.getByRole('combobox', { name: 'Hráč' });
  await userEvent.type(input, 'pepa');
  await userEvent.click(await screen.findByRole('option', { name: /Pépa/ }));
  expect(screen.getByTestId('sel')).toHaveTextContent('Pépa');
  await userEvent.clear(input);
  await userEvent.type(input, 'jana');
  expect(screen.queryByRole('option')).not.toBeInTheDocument();
});
