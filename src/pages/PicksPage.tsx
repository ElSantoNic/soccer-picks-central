import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import MatchCard from "@/components/MatchCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Loader2, Volleyball } from "lucide-react";
import type { Match } from "@/lib/mockData";

const PicksPage = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [jornadaId, setJornadaId] = useState<string | null>(null);
  const [jornadaNumber, setJornadaNumber] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<Record<string, '1' | 'X' | '2'>>({});
  const [matchIdMap, setMatchIdMap] = useState<Record<string, string>>({}); // csv/display id -> db uuid
  const [isSaving, setIsSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Auth gate
  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const { data: openJornadas } = await supabase
        .from('jornadas')
        .select('*, matches(id)')
        .eq('status', 'open')
        .order('jornada_number', { ascending: false });

      const jornada = (openJornadas || []).find(j => (j.matches as any[])?.length > 0);

      if (!jornada) {
        setLoading(false);
        return;
      }

      setJornadaId(jornada.id);
      setJornadaNumber(jornada.jornada_number);

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('jornada_id', jornada.id)
        .order('kickoff_utc', { ascending: true });

      const idMap: Record<string, string> = {};
      const mapped: Match[] = (matchData || []).map(m => {
        const displayId = m.match_id_csv || m.id;
        idMap[displayId] = m.id;
        return {
          match_id: displayId,
          home_team: m.home_team,
          away_team: m.away_team,
          kickoff_utc: m.kickoff_utc,
          home_score: m.home_score,
          away_score: m.away_score,
          result_1x2: m.result_1x2 as '1' | 'X' | '2' | null,
        };
      });

      setMatches(mapped);
      setMatchIdMap(idMap);

      // Load existing picks for this user + jornada
      const { data: existingPicks } = await supabase
        .from('picks')
        .select('match_id, pick')
        .eq('user_id', user.id)
        .eq('jornada_id', jornada.id);

      // Reverse map db uuid -> display id
      const reverseMap: Record<string, string> = {};
      Object.entries(idMap).forEach(([disp, uuid]) => { reverseMap[uuid] = disp; });

      const seeded: Record<string, '1' | 'X' | '2'> = {};
      (existingPicks || []).forEach(p => {
        const displayId = reverseMap[p.match_id];
        if (displayId) seeded[displayId] = p.pick as '1' | 'X' | '2';
      });
      setPicks(seeded);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  const isJornadaLocked = matches.length > 0 && matches.some(m => new Date(m.kickoff_utc) <= new Date());

  const handlePickChange = (matchId: string, pick: '1' | 'X' | '2') => {
    if (isJornadaLocked) return;
    setPicks(prev => ({ ...prev, [matchId]: pick }));
    setDirty(true);
  };

  const pickedCount = Object.keys(picks).length;
  const totalMatches = matches.length;

  const handleSave = async () => {
    if (!user || !jornadaId) return;
    setIsSaving(true);

    const rows = Object.entries(picks).map(([displayId, pick]) => ({
      user_id: user.id,
      match_id: matchIdMap[displayId],
      jornada_id: jornadaId,
      pick,
    })).filter(r => r.match_id);

    const { error } = await supabase
      .from('picks')
      .upsert(rows, { onConflict: 'user_id,match_id' });

    setIsSaving(false);

    if (error) {
      toast.error(`Error al guardar: ${error.message}`);
      return;
    }

    setDirty(false);
    toast.success('¡Picks guardados! ✓');
  };

  const firstFutureMatch = matches.find(m => new Date(m.kickoff_utc) > new Date());

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36 bg-background">
      <TopBar
        jornadaNumber={jornadaNumber}
        firstKickoffUtc={firstFutureMatch?.kickoff_utc}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
        {matches.length === 0 ? (
          <div className="text-center py-16">
            <Volleyball size={48} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-4" />
            <p className="font-semibold text-lg">No hay jornada activa en este momento.</p>
            <p className="text-sm text-muted-foreground mt-1">¡Vuelve pronto!</p>
          </div>
        ) : (
          <>
            <h2 className="text-base font-bold mb-3">
              Jornada {jornadaNumber} — Haz tus pronósticos
            </h2>
            {isJornadaLocked && (
              <div className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                <span className="font-semibold text-destructive">🔒 Jornada cerrada</span>
                <p className="text-muted-foreground mt-1">
                  La jornada ya comenzó. No puedes cambiar tus picks.
                </p>
              </div>
            )}
            <div className="space-y-3">
              {matches.map(match => (
                <MatchCard
                  key={match.match_id}
                  match={match}
                  currentPick={picks[match.match_id] || null}
                  isLocked={isJornadaLocked}
                  onPickChange={handlePickChange}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {matches.length > 0 && !isJornadaLocked && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSave}
              disabled={pickedCount === 0 || isSaving || !dirty}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all active:scale-[0.98] ${
                !dirty && pickedCount > 0
                  ? 'bg-success text-primary-foreground'
                  : pickedCount > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Guardando...
                </span>
              ) : !dirty && pickedCount > 0 ? (
                'Picks guardados ✓'
              ) : (
                <>Guardar mis picks</>
              )}
            </button>
            <p className="text-center text-xs text-muted-foreground mt-1">
              {pickedCount} de {totalMatches} picks
            </p>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default PicksPage;
