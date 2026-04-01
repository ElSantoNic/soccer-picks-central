import { useState } from "react";
import { Match } from "@/lib/mockData";
import MatchCard from "@/components/MatchCard";
import CsvUpload, { ParsedMatch } from "@/components/CsvUpload";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const PicksPage = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [picks, setPicks] = useState<Record<string, '1' | 'X' | '2'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);
  const [jornadaNumber, setJornadaNumber] = useState<number>(1);

  const handleMatchesLoaded = (parsed: ParsedMatch[]) => {
    const loaded: Match[] = parsed.map(m => ({
      ...m,
      home_score: null,
      away_score: null,
      result_1x2: null,
    }));
    setMatches(loaded);
    setPicks({});
    setHasSaved(false);
    toast.success(`${loaded.length} partidos cargados`);
  };

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

  return (
    <div className="min-h-screen pb-36">
      <TopBar
        jornadaNumber={jornadaNumber}
        firstKickoffUtc={firstFutureMatch?.kickoff_utc}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
        {matches.length === 0 ? (
          <div className="mt-8">
            <h2 className="text-base font-bold mb-4">Cargar calendario de partidos</h2>
            <div className="mb-4">
              <label className="text-sm font-medium mb-1 block">Número de Jornada</label>
              <input
                type="number"
                min={1}
                value={jornadaNumber}
                onChange={e => setJornadaNumber(Number(e.target.value))}
                className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <CsvUpload onMatchesLoaded={handleMatchesLoaded} />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold">
                Jornada {jornadaNumber} — Haz tus pronósticos
              </h2>
              <button
                onClick={() => { setMatches([]); setPicks({}); setHasSaved(false); }}
                className="text-xs text-electric-blue hover:underline"
              >
                Cambiar CSV
              </button>
            </div>

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
              className={`w-full py-4 rounded-lg font-bold text-lg shadow-lg transition-all active:scale-[0.98] ${
                hasSaved
                  ? 'bg-success text-primary-foreground'
                  : pickedCount > 0
                    ? 'bg-amber text-navy hover:brightness-110'
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
