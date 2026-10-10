import { render, screen } from '@testing-library/react';
import App from './App';

test('renders app name', () => {
  render(<App />);
  expect(screen.getByText('Ufo-IS')).toBeInTheDocument();
});
