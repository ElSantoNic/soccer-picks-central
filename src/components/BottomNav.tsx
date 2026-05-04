import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Volleyball, Trophy, ClipboardList, User, type LucideIcon } from "lucide-react";

const tabs: { id: string; labelKey: string; Icon: LucideIcon; path: string }[] = [
  { id: 'picks', labelKey: 'nav.picks', Icon: Volleyball, path: '/picks' },
  { id: 'league', labelKey: 'nav.leagues', Icon: Trophy, path: '/leagues' },
  { id: 'results', labelKey: 'nav.results', Icon: ClipboardList, path: '/picks/results' },
  { id: 'profile', labelKey: 'nav.profile', Icon: User, path: '/profile' },
];

const HIDDEN_ROUTES = ['/', '/auth', '/admin', '/about'];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  if (HIDDEN_ROUTES.includes(location.pathname)) return null;

  const activeTab = [...tabs]
    .sort((a, b) => b.path.length - a.path.length)
    .find(t => location.pathname === t.path || location.pathname.startsWith(t.path + '/'))
    ?.id ?? 'picks';

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map(tab => {
          const isActive = tab.id === activeTab;
          const Icon = tab.Icon;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex flex-col items-center gap-1 py-1 px-3 transition-colors ${
                isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={22} strokeWidth={2.25} />
              <span className="text-[10px] font-medium">{t(tab.labelKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
