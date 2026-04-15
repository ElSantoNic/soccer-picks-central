import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import MatchCard from "@/components/MatchCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Match } from "@/lib/mockData";

const PicksPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [jornadaNumber, setJornadaNumber] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [picks, setPicks] = useState<Record<string, '1' | 'X' | '2'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    const fetchMatches = async () => {
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

      setJornadaNumber(jornada.jornada_number);

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('jornada_id', jornada.id)
        .order('kickoff_utc', { ascending: true });

      const mapped: Match[] = (matchData || []).map(m => ({
        match_id: m.match_id_csv || m.id,
        home_team: m.home_team,
        away_team: m.away_team,
        kickoff_utc: m.kickoff_utc,
        home_score: m.home_score,
        away_score: m.away_score,
        result_1x2: m.result_1x2 as '1' | 'X' | '2' | null,
      }));

      setMatches(mapped);
      setLoading(false);
    };

    fetchMatches();
  }, []);

  const handlePickChange = (matchId: string, pick: '1' | 'X' | '2') => {
    setPicks(prev => ({ ...prev, [matchId]: pick }));
    setHasSaved(false);
  };

  const pickedCount = Object.keys(picks).length;
  const totalMatches = matches.length;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    setHasSaved(true);
    toast.success('¡Picks guardados! ✓');
  };

  const firstFutureMatch = matches.find(m => new Date(m.kickoff_utc) > new Date());

  if (loading) {
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
            <p className="text-4xl mb-4">⚽</p>
            <p className="font-semibold text-lg">No hay jornada activa en este momento.</p>
            <p className="text-sm text-muted-foreground mt-1">¡Vuelve pronto!</p>
          </div>
        ) : (
          <>
            <h2 className="text-base font-bold mb-3">
              Jornada {jornadaNumber} — Haz tus pronósticos
            </h2>
            <div className="space-y-3">
              {matches.map(match => {
                const isLocked = new Date(match.kickoff_utc) < new Date();
                return (
                  <MatchCard
                    key={match.match_id}
                    match={match}
                    currentPick={picks[match.match_id] || null}
                    isLocked={isLocked}
                    onPickChange={handlePickChange}
                  />
                );
              })}
            </div>
          </>
        )}
      </main>

      {matches.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 p-4">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSave}
              disabled={pickedCount === 0 || isSaving}
              className={`w-full py-4 rounded-lg font-bold text-lg transition-all active:scale-[0.98] ${
                hasSaved
                  ? 'bg-success text-primary-foreground'
                  : pickedCount > 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
                    : 'bg-muted text-muted-foreground cursor-not-allowed'
              }`}
            >
              {isSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Guardando...
                </span>
              ) : hasSaved ? (
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
