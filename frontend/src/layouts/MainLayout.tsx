import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export function MainLayout() {
  const { pathname } = useLocation();
  const isExplorer = pathname.startsWith('/explorer');

  return (
    <div className="flex h-screen flex-col bg-[var(--bg)]">
      <TopNav />
      <div className="flex flex-1 overflow-hidden">
        {!isExplorer && <Sidebar />}
        <main className="flex-1 overflow-hidden">
          <div key={pathname} className="h-full animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
