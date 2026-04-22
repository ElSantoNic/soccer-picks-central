import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ResultCard from "@/components/ResultCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  result_1x2: string | null;
  kickoff_utc: string;
}

interface PickRow {
  match_id: string;
  pick: string;
  is_correct: boolean | null;
  points_awarded: number;
}

const ResultsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jornadaNumber, setJornadaNumber] = useState<number | null>(null);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [picksByMatch, setPicksByMatch] = useState<Record<string, PickRow>>({});

  useEffect(() => {
    if (authLoading) return;

    const load = async () => {
      setLoading(true);

      // 1. Find most recent jornada that has at least one scored match
      const { data: scoredMatches } = await supabase
        .from("matches")
        .select("jornada_id, jornadas!inner(jornada_number)")
        .not("result_1x2", "is", null)
        .order("jornada_id");

      if (!scoredMatches || scoredMatches.length === 0) {
        setJornadaNumber(null);
        setMatches([]);
        setPicksByMatch({});
        setLoading(false);
        return;
      }

      // Pick the jornada with the highest jornada_number
      let bestJornadaId = scoredMatches[0].jornada_id;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let bestNumber = (scoredMatches[0] as any).jornadas.jornada_number as number;
      for (const row of scoredMatches) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const n = (row as any).jornadas.jornada_number as number;
        if (n > bestNumber) {
          bestNumber = n;
          bestJornadaId = row.jornada_id;
        }
      }

      // 2. Fetch all scored matches for that jornada
      const { data: matchRows } = await supabase
        .from("matches")
        .select("id, home_team, away_team, home_score, away_score, result_1x2, kickoff_utc")
        .eq("jornada_id", bestJornadaId)
        .not("result_1x2", "is", null)
        .order("kickoff_utc");

      const finalMatches = (matchRows ?? []) as MatchRow[];

      // 3. Fetch user picks for those matches (RLS scopes to current user)
      let pickMap: Record<string, PickRow> = {};
      if (user && finalMatches.length > 0) {
        const { data: pickRows } = await supabase
          .from("picks")
          .select("match_id, pick, is_correct, points_awarded")
          .eq("jornada_id", bestJornadaId)
          .in(
            "match_id",
            finalMatches.map((m) => m.id),
          );
        pickMap = Object.fromEntries(((pickRows ?? []) as PickRow[]).map((p) => [p.match_id, p]));
      }

      setJornadaNumber(bestNumber);
      setMatches(finalMatches);
      setPicksByMatch(pickMap);
      setLoading(false);
    };

    load();
  }, [user, authLoading]);

  const totalPoints = Object.values(picksByMatch).reduce((sum, p) => sum + (p.points_awarded ?? 0), 0);

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 py-4">
        {loading || authLoading ? (
          <>
            <Skeleton className="h-32 w-full mb-5 rounded-xl" />
            <Skeleton className="h-5 w-24 mb-3" />
            <div className="space-y-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full rounded-lg" />
              ))}
            </div>
          </>
        ) : !user ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-base font-semibold mb-2">Inicia sesión para ver tus resultados</p>
            <p className="text-sm text-muted-foreground mb-4">
              Necesitamos saber quién eres para mostrar tus picks y puntos.
            </p>
            <Button asChild>
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
          </div>
        ) : jornadaNumber === null || matches.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-base font-semibold mb-1">Aún no hay resultados para mostrar</p>
            <p className="text-sm text-muted-foreground">
              Cuando termine una jornada con resultados publicados, aparecerá aquí.
            </p>
          </div>
        ) : (
          <>
            <motion.div
              className="bg-card border border-border rounded-xl p-6 mb-5 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-sm text-muted-foreground mb-1">Jornada {jornadaNumber} completada</p>
              <motion.p
                className="text-5xl font-bold text-primary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                {totalPoints}
              </motion.p>
              <p className="text-sm text-muted-foreground">puntos</p>
              <motion.span
                className="inline-block mt-2 text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                +{totalPoints} pts esta jornada
              </motion.span>
            </motion.div>

            <h2 className="text-base font-bold mb-3">Resultados</h2>

            <div className="space-y-3">
              {matches.map((match, i) => {
                const pick = picksByMatch[match.id];
                const userPick = (pick?.pick as "1" | "X" | "2" | undefined) ?? null;
                return (
                  <motion.div
                    key={match.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <ResultCard
                      homeTeam={match.home_team}
                      awayTeam={match.away_team}
                      homeScore={match.home_score!}
                      awayScore={match.away_score!}
                      userPick={userPick}
                      isCorrect={pick?.is_correct === true}
                    />
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default ResultsPage;
