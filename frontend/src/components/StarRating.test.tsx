import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, test } from 'vitest';
import StarRating from './StarRating';

function Harness() {
  const [v, setV] = useState(0);
  return <StarRating value={v} onChange={setV} />;
}

test('buttons and keyboard change rating in halves within bounds', async () => {
  render(<Harness />);
  const slider = screen.getByRole('slider', { name: 'Celkové hodnocení' });
  await userEvent.click(screen.getByRole('button', { name: 'Zvýšit hodnocení' }));
  expect(slider).toHaveAttribute('aria-valuenow', '0.5');
  slider.focus();
  for (let i = 0; i < 12; i++) await userEvent.keyboard('{ArrowRight}');
  expect(slider).toHaveAttribute('aria-valuenow', '5');
  await userEvent.click(screen.getByRole('button', { name: 'Snížit hodnocení' }));
  expect(slider).toHaveAttribute('aria-valuenow', '4.5');
});
