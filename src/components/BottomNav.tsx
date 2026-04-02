import { useLocation, useNavigate } from "react-router-dom";

const tabs = [
  { id: 'picks', label: 'Picks', emoji: '⚽', path: '/picks' },
  { id: 'league', label: 'Quinielas', emoji: '🏆', path: '/leagues' },
  { id: 'results', label: 'Resultados', emoji: '📋', path: '/picks/results' },
  { id: 'profile', label: 'Perfil', emoji: '👤', path: '/profile' },
] as const;

const HIDDEN_ROUTES = ['/', '/auth', '/admin', '/about'];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  if (HIDDEN_ROUTES.includes(location.pathname)) return null;

  const activeTab = tabs.find(t => location.pathname.startsWith(t.path))?.id ?? 'picks';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-navy shadow-[0_-2px_10px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 transition-colors ${
                isActive ? 'text-electric-blue' : 'text-white/60 hover:text-white/80'
              }`}
            >
              <span className="text-xl">{tab.emoji}</span>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
