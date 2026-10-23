import type { ReactNode } from 'react';

/** Lets wide content grow past the page column up to the viewport width, centered; scrolls beyond that. */
export default function WideBox({ children }: { children: ReactNode }) {
  return (
    <div className="relative left-1/2 w-screen -translate-x-1/2 overflow-x-auto px-1">
      <div className="mx-auto w-fit min-w-[min(62.5rem,100%)]">{children}</div>
    </div>
  );
}
