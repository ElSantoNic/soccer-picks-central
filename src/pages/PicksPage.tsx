import { useState } from "react";
import { openMatches, currentJornada } from "@/lib/mockData";
import MatchCard from "@/components/MatchCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const PicksPage = () => {
  const [picks, setPicks] = useState<Record<string, '1' | 'X' | '2'>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasSaved, setHasSaved] = useState(false);

  const handlePickChange = (matchId: string, pick: '1' | 'X' | '2') => {
    setPicks(prev => ({ ...prev, [matchId]: pick }));
    setHasSaved(false);
  };

  const pickedCount = Object.keys(picks).length;
  const totalMatches = openMatches.length;

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise(r => setTimeout(r, 800));
    setIsSaving(false);
    setHasSaved(true);
    toast.success('¡Picks guardados! ✓');
  };

  // Find first future match for countdown
  const firstFutureMatch = openMatches.find(m => new Date(m.kickoff_utc) > new Date());

  return (
    <div className="min-h-screen pb-36">
      <TopBar
        jornadaNumber={currentJornada.jornada_number}
        firstKickoffUtc={firstFutureMatch?.kickoff_utc}
      />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Guest banner */}
        <div className="bg-amber/10 border-l-4 border-amber rounded-r-lg p-3 mb-4">
          <p className="text-sm font-medium">Guarda tus picks — confirma tu número de WhatsApp</p>
          <div className="flex gap-2 mt-2">
            <button className="text-xs font-semibold text-electric-blue hover:underline">Confirmar</button>
          </div>
        </div>

        <h2 className="text-base font-bold mb-3">
          Jornada {currentJornada.jornada_number} — Haz tus pronósticos
        </h2>

        <div className="space-y-3">
          {openMatches.map(match => {
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
      </main>

      {/* Sticky save button */}
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

      <BottomNav />
    </div>
  );
};

export default PicksPage;
