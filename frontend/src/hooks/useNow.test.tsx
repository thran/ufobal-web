import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { useNow } from './useNow';

afterEach(() => vi.useRealTimers());

test('value is fresh right after activation', () => {
  vi.useFakeTimers({ now: 1000 });
  const { result, rerender } = renderHook(({ active }) => useNow(1000, active), {
    initialProps: { active: false },
  });
  expect(result.current).toBe(1000);
  vi.setSystemTime(60_000);
  rerender({ active: true });
  act(() => {
    vi.advanceTimersByTime(0);
  });
  expect(result.current).toBe(60_000);
});
