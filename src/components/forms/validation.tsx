import { useState } from 'react';

export type FieldErrors<K extends string> = Partial<Record<K, string | false | null | undefined>>;

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Shows a field's error once the field was left (blur) or a submit was attempted,
 * so the user is not shouted at while still typing.
 */
export function useValidation<K extends string>(errors: FieldErrors<K>) {
  const [touched, setTouched] = useState<ReadonlySet<K>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  const valid = Object.values(errors).every((e) => !e);

  return {
    valid,
    error: (k: K): string | undefined => ((submitted || touched.has(k)) && errors[k]) || undefined,
    touch: (k: K) => () => setTouched((t) => (t.has(k) ? t : new Set(t).add(k))),
    /** Reveals all errors; returns whether the form may be submitted. */
    attempt: () => {
      setSubmitted(true);
      return valid;
    },
    reset: () => {
      setTouched(new Set());
      setSubmitted(false);
    },
  };
}

export function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return <p className="mt-1 text-sm text-alert">⚠ {error}</p>;
}
