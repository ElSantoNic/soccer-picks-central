import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ResultCard from "@/components/ResultCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { AlertCircle } from "lucide-react";
import { formatJornadaLabel } from "@/lib/jornadaLabel";

interface MatchRow {
  id: string;
  jornada_id: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  result_1x2: string | null;
  kickoff_utc: string;
}

interface PickRow {
  match_id: string;
  jornada_id: string;
  pick: string;
  is_correct: boolean | null;
  points_awarded: number;
}

interface JornadaBundle {
  id: string;
  jornada_number: number;
  stage: string;
  leg: string;
  matches: MatchRow[];
  picksByMatch: Record<string, PickRow>;
}

const ResultsPage = () => {
  const { user, loading: authLoading } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bundles, setBundles] = useState<JornadaBundle[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      setLoading(true);
      setError(null);

      const { data: jornadaRows, error: jornadaErr } = await supabase
        .from("jornadas")
        .select("id, jornada_number")
        .order("jornada_number", { ascending: false });

      if (jornadaErr) {
        console.error("Error fetching jornadas:", jornadaErr);
        toast.error(t("results.errLoadJornadasToast"));
        setError(t("results.errLoadJornadas"));
        setLoading(false);
        return;
      }

      const jornadaById = new Map<string, number>(
        (jornadaRows ?? []).map((j) => [j.id, j.jornada_number]),
      );

      const { data: pickRows, error: pickErr } = await supabase
        .from("picks")
        .select("match_id, jornada_id, pick, is_correct, points_awarded");

      if (pickErr) {
        console.error("Error fetching picks:", pickErr);
        toast.error(t("results.errLoadPicksToast"));
        setError(t("results.errLoadPicks"));
        setLoading(false);
        return;
      }

      const picks = (pickRows ?? []) as PickRow[];
      const playedJornadaIds = Array.from(new Set(picks.map((p) => p.jornada_id)));

      if (playedJornadaIds.length === 0) {
        setBundles([]);
        setSelectedId(null);
        setLoading(false);
        return;
      }

      const { data: matchRows, error: matchErr } = await supabase
        .from("matches")
        .select("id, jornada_id, home_team, away_team, home_score, away_score, result_1x2, kickoff_utc")
        .in("jornada_id", playedJornadaIds)
        .not("result_1x2", "is", null)
        .order("kickoff_utc");

      if (matchErr) {
        console.error("Error fetching matches:", matchErr);
        toast.error(t("results.errLoadMatchesToast"));
        setError(t("results.errLoadMatches"));
        setLoading(false);
        return;
      }

      const matches = (matchRows ?? []) as MatchRow[];

      const bundleMap = new Map<string, JornadaBundle>();
      for (const jid of playedJornadaIds) {
        const num = jornadaById.get(jid);
        if (num === undefined) continue;
        bundleMap.set(jid, {
          id: jid,
          jornada_number: num,
          matches: [],
          picksByMatch: {},
        });
      }
      for (const m of matches) {
        const b = bundleMap.get(m.jornada_id);
        if (b) b.matches.push(m);
      }
      for (const p of picks) {
        const b = bundleMap.get(p.jornada_id);
        if (!b) continue;
        if (b.matches.some((m) => m.id === p.match_id)) {
          b.picksByMatch[p.match_id] = p;
        }
      }

      const built = Array.from(bundleMap.values())
        .filter((b) => b.matches.length > 0 && Object.keys(b.picksByMatch).length > 0)
        .sort((a, b) => b.jornada_number - a.jornada_number);

      setBundles(built);
      setSelectedId(built[0]?.id ?? null);
      setLoading(false);
    };

    load();
  }, [user, authLoading, t]);

  const selected = useMemo(
    () => bundles.find((b) => b.id === selectedId) ?? null,
    [bundles, selectedId],
  );

  const totalPoints = useMemo(() => {
    if (!selected) return 0;
    return Object.values(selected.picksByMatch).reduce(
      (sum, p) => sum + (p.points_awarded ?? 0),
      0,
    );
  }, [selected]);

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
        ) : error ? (
          <div className="bg-card border border-destructive/40 rounded-xl p-6 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="text-base font-semibold mb-2">{t("common.somethingWrong")}</p>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t("common.retry")}</Button>
          </div>
        ) : !user ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-base font-semibold mb-2">{t("results.signInTitle")}</p>
            <p className="text-sm text-muted-foreground mb-4">
              {t("results.signInDesc")}
            </p>
            <Button asChild>
              <Link to="/auth">{t("results.signInBtn")}</Link>
            </Button>
          </div>
        ) : !selected ? (
          <div className="bg-card border border-border rounded-xl p-6 text-center">
            <p className="text-base font-semibold mb-1">{t("results.noResultsTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {t("results.noResultsDesc")}
            </p>
          </div>
        ) : (
          <>
            {bundles.length > 1 && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t("results.jornadaLabel")}
                </label>
                <Select value={selectedId ?? undefined} onValueChange={setSelectedId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("results.pickJornada")} />
                  </SelectTrigger>
                  <SelectContent>
                    {bundles.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {t("results.jornadaItem", { number: b.jornada_number })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <motion.div
              key={selected.id}
              className="bg-card border border-border rounded-xl p-6 mb-5 text-center"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <p className="text-sm text-muted-foreground mb-1">
                {t("results.jornadaCompleted", { number: selected.jornada_number })}
              </p>
              <motion.p
                className="text-5xl font-bold text-primary"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                {totalPoints}
              </motion.p>
              <p className="text-sm text-muted-foreground">{t("results.points")}</p>
              <motion.span
                className="inline-block mt-2 text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {t("results.pointsThisJornada", { n: totalPoints })}
              </motion.span>
            </motion.div>

            <h2 className="text-base font-bold mb-3">{t("results.heading")}</h2>

            <div className="space-y-3">
              {selected.matches.map((match, i) => {
                const pick = selected.picksByMatch[match.id];
                const userPick = (pick?.pick as "1" | "X" | "2" | undefined) ?? null;
                return (
                  <motion.div
                    key={`${selected.id}-${match.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
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
