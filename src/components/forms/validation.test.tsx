import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test, vi } from 'vitest';
import { FieldError, useValidation } from './validation';

function Form({ onSubmit }: { onSubmit: () => void }) {
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const v = useValidation({ a: !a && 'A chybí', b: !b && 'B chybí' });
  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (v.attempt()) onSubmit();
      }}
    >
      <input aria-label="a" value={a} onChange={(e) => setA(e.target.value)} onBlur={v.touch('a')} />
      <FieldError error={v.error('a')} />
      <input aria-label="b" value={b} onChange={(e) => setB(e.target.value)} onBlur={v.touch('b')} />
      <FieldError error={v.error('b')} />
      <button type="submit">ok</button>
    </form>
  );
}

test('errors appear after blur or submit attempt and gate submission', async () => {
  const onSubmit = vi.fn();
  render(<Form onSubmit={onSubmit} />);
  expect(screen.queryByText(/chybí/)).toBeNull();
  await userEvent.click(screen.getByLabelText('a'));
  await userEvent.tab();
  expect(screen.getByText(/A chybí/)).toBeInTheDocument();
  expect(screen.queryByText(/B chybí/)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'ok' }));
  expect(screen.getByText(/B chybí/)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
  await userEvent.type(screen.getByLabelText('a'), 'x');
  await userEvent.type(screen.getByLabelText('b'), 'y');
  expect(screen.queryByText(/chybí/)).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'ok' }));
  expect(onSubmit).toHaveBeenCalledOnce();
});
