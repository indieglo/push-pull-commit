import { Outlet } from 'react-router-dom';
import { BottomNav } from './BottomNav';

export function AppShell() {
  return (
    <div className="min-h-screen pb-20 overflow-x-hidden">
      <main className="max-w-lg mx-auto px-3 pt-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
