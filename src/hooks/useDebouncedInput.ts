import { useEffect, useRef, useState } from 'react';

/** Local draft of an input that is committed after `delay` ms of inactivity and re-seeded when `value` changes externally. */
export function useDebouncedInput(value: string, commit: (v: string) => void, delay = 300) {
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  if (value !== seen) {
    setSeen(value);
    setDraft(value);
  }
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  });
  useEffect(() => {
    if (draft === value) return;
    const timer = setTimeout(() => commitRef.current(draft), delay);
    return () => clearTimeout(timer);
  }, [draft, value, delay]);
  return [draft, setDraft] as const;
}
