import { useLocation, useNavigate } from 'react-router-dom';
import { Dumbbell, History, Heart, Settings } from 'lucide-react';

const tabs = [
  { path: '/', icon: Dumbbell, label: 'Workout' },
  { path: '/history', icon: History, label: 'History' },
  { path: '/health', icon: Heart, label: 'Health' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-gray-700 pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center w-full h-full gap-1 transition-colors ${
                isActive ? 'text-brand-light' : 'text-gray-400'
              }`}
            >
              <Icon size={24} />
              <span className="text-xs">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
