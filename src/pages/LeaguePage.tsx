import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import LeaderboardRow from "@/components/LeaderboardRow";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

interface LeagueMember {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_emoji: string;
  points_jornada: number;
  points_total: number;
  badges: string[];
}

interface League {
  id: string;
  name: string;
  join_code: string | null;
  description: string | null;
  created_by: string | null;
}

const LeaguePage = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'tabla' | 'miembros'>('tabla');
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leagueId) return;
    const fetchData = async () => {
      const [leagueRes, membersRes] = await Promise.all([
        supabase
          .from('leagues')
          .select('id, name, description, created_by')
          .eq('id', leagueId)
          .single(),
        supabase.from('league_members').select('*').eq('league_id', leagueId),
      ]);
      if (leagueRes.data) {
        let join_code: string | null = null;
        if (user && leagueRes.data.created_by === user.id) {
          const { data: codeData } = await supabase
            .rpc('get_league_join_code', { _league_id: leagueRes.data.id });
          join_code = (codeData as string | null) ?? null;
        }
        setLeague({ ...leagueRes.data, join_code });
      }
      if (membersRes.data) setMembers(membersRes.data as LeagueMember[]);
      setLoading(false);
    };
    fetchData();
  }, [leagueId, user]);

  const sorted = [...members].sort((a, b) => b.points_total - a.points_total);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <div className="text-center py-20 text-muted-foreground text-sm">Cargando...</div>
        <BottomNav />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <div className="text-center py-20">
          <p className="text-4xl mb-3">😕</p>
          <p className="font-semibold">Quiniela no encontrada</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />

      <main className="max-w-lg mx-auto">
        {/* League header */}
        <div className="bg-card border-b border-border px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{league.name}</h2>
              <p className="text-xs text-muted-foreground">
                {members.length} miembros
                {league.join_code ? ` · Código: ${league.join_code}` : ''}
              </p>
            </div>
            <button className="text-xl p-2 hover:bg-secondary rounded-full transition-colors">📤</button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-card">
          {(['tabla', 'miembros'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'tabla' ? '📊 Tabla' : '👥 Miembros'}
            </button>
          ))}
        </div>

        {/* Content */}
        {members.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👥</p>
            <p className="font-semibold mb-1">Sin miembros aún</p>
            <p className="text-sm text-muted-foreground">Comparte el código para invitar gente</p>
          </div>
        ) : activeTab === 'tabla' ? (
          <div className="bg-card">
            {sorted.map((member, i) => (
              <LeaderboardRow
                key={member.id}
                rank={i + 1}
                member={member}
                isCurrentUser={false}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {members.map(member => (
              <div key={member.id} className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                  {member.avatar_emoji}
                </div>
                <div>
                  <p className="font-semibold text-sm">{member.display_name}</p>
                  <p className="text-xs text-muted-foreground">{member.points_total} puntos totales</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default LeaguePage;
