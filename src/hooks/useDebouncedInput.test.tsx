import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedInput } from './useDebouncedInput';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('commits after delay with latest commit callback', () => {
  const first = vi.fn();
  const second = vi.fn();
  const { result, rerender } = renderHook(({ commit }) => useDebouncedInput('', commit), {
    initialProps: { commit: first },
  });
  act(() => result.current[1]('ab'));
  rerender({ commit: second });
  act(() => vi.advanceTimersByTime(300));
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledWith('ab');
});

test('re-seeds draft when value changes externally', () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedInput(value, vi.fn()), {
    initialProps: { value: 'x' },
  });
  rerender({ value: 'y' });
  expect(result.current[0]).toBe('y');
});

test('does not commit when draft equals value', () => {
  const commit = vi.fn();
  renderHook(() => useDebouncedInput('same', commit));
  act(() => vi.advanceTimersByTime(1000));
  expect(commit).not.toHaveBeenCalled();
});
