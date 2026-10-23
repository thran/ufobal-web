import { Outlet } from 'react-router';
import { Toaster } from 'sonner';
import { useAppConfig } from '../AppContext';
import { useSocialLoginListener } from '../auth/user';
import Footer from './Footer';
import TopBar from './TopBar';

export default function Layout() {
  const { test } = useAppConfig();
  useSocialLoginListener();
  return (
    <div className="relative min-h-screen">
      <TopBar />
      <main className="mx-auto max-w-[62.5rem] px-1 pt-5 pb-30">
        {test && (
          <div className="callout callout-alert mb-4 text-center">
            Testovací verze - změny zde se <b>nepromítnou</b> do{' '}
            <a className="text-sky-200" href="https://is.ufobal.cz">
              ostrého systému
            </a>
            .
          </div>
        )}
        <Outlet />
      </main>
      <Footer />
      <Toaster position="top-right" richColors />
    </div>
  );
}
