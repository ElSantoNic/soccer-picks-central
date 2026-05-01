import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface TopBarProps {
  jornadaNumber?: number;
  firstKickoffUtc?: string;
}

const TopBar = ({ jornadaNumber = 10, firstKickoffUtc }: TopBarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [countdown, setCountdown] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);

  const isPicksPage = location.pathname === '/picks';

  useEffect(() => {
    if (!firstKickoffUtc || !isPicksPage) return;

    const update = () => {
      const diff = new Date(firstKickoffUtc).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('00:00:00');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      setIsUrgent(diff < 2 * 3600000);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [firstKickoffUtc, isPicksPage]);

  if (location.pathname === '/auth') return null;

  return (
    <header className="sticky top-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <h1
          className="text-lg font-bold tracking-tight cursor-pointer text-foreground"
          onClick={() => navigate('/')}
        >
          FC Quiniela
        </h1>

        {isPicksPage && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-muted-foreground">Jornada {jornadaNumber}</span>
            {countdown && (
              <span className={`font-mono font-semibold ${isUrgent ? 'text-destructive' : 'text-primary'}`}>
                {countdown}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {!user && (
            <button
              onClick={() => navigate('/auth')}
              className="text-xs font-semibold bg-primary text-primary-foreground px-3 py-1.5 rounded-lg hover:bg-primary/90 transition-all"
            >
              Entrar
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
