import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

interface League {
  id: string;
  name: string;
  join_code: string;
  description: string | null;
  created_at: string;
  member_count?: number;
}

const LeaguesListPage = () => {
  const navigate = useNavigate();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, join_code, description, created_at')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const leaguesWithCounts = await Promise.all(
        data.map(async (league) => {
          const { count } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', league.id);
          return { ...league, member_count: count ?? 0 };
        })
      );
      setLeagues(leaguesWithCounts);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    if (!joinCode.trim()) return;
    const { data } = await supabase
      .from('leagues')
      .select('id')
      .eq('join_code', joinCode.trim())
      .single();

    if (data) {
      navigate(`/league/${data.id}`);
    } else {
      alert('Código no encontrado');
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Mis Quinielas</h2>
          <button
            onClick={() => navigate('/league/create')}
            className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary/90 active:scale-95 transition-all"
          >
            + Crear
          </button>
        </div>

        {/* Join by code */}
        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder="Código de acceso"
            maxLength={4}
            className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-card text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleJoin}
            className="bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-primary/90 transition-all"
          >
            Unirse
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Cargando...</div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold mb-1">No tienes quinielas aún</p>
            <p className="text-sm text-muted-foreground">Crea una o únete con un código</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leagues.map(league => (
              <button
                key={league.id}
                onClick={() => navigate(`/league/${league.id}`)}
                className="w-full bg-card rounded-xl p-4 border border-border text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{league.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {league.member_count} miembros · Código: {league.join_code}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <BottomNav />
    </div>
  );
};

export default LeaguesListPage;
