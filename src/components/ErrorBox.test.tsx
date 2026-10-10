import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { ApiError } from '../api/client';
import ErrorBox from './ErrorBox';

test('shows message and retry', async () => {
  const onRetry = vi.fn();
  render(<ErrorBox error={new ApiError(500, 'Server spadl')} onRetry={onRetry} />);
  expect(screen.getByRole('alert')).toHaveTextContent('Server spadl');
  await userEvent.click(screen.getByRole('button', { name: 'Zkusit znovu' }));
  expect(onRetry).toHaveBeenCalled();
});

test('generic message for unknown error, no retry button', () => {
  render(<ErrorBox error="weird" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Nepodařilo se načíst data.');
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});
