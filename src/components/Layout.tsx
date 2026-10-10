import { Outlet } from 'react-router';

export default function Layout() {
  return (
    <main className="mx-auto max-w-[62.5rem] px-1 pt-5 pb-30">
      <Outlet />
    </main>
  );
}
