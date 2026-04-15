import { completedJornada, completedMatches } from "@/lib/mockData";
import ResultCard from "@/components/ResultCard";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { motion } from "framer-motion";

const ResultsPage = () => {
  const correctCount = completedMatches.filter(m => m.isCorrect).length;

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* Score summary */}
        <motion.div
          className="bg-card border border-border rounded-xl p-6 mb-5 text-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-sm text-muted-foreground mb-1">Jornada {completedJornada.jornada_number} completada</p>
          <motion.p
            className="text-5xl font-bold text-primary"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            {correctCount}
          </motion.p>
          <p className="text-sm text-muted-foreground">puntos</p>
          <motion.span
            className="inline-block mt-2 text-sm font-semibold text-success bg-success/10 px-3 py-1 rounded-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            +{correctCount} pts esta jornada
          </motion.span>
        </motion.div>

        <h2 className="text-base font-bold mb-3">Resultados</h2>

        <div className="space-y-3">
          {completedMatches.map((match, i) => (
            <motion.div
              key={match.match_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <ResultCard
                homeTeam={match.home_team}
                awayTeam={match.away_team}
                homeScore={match.home_score!}
                awayScore={match.away_score!}
                userPick={match.userPick}
                isCorrect={match.isCorrect}
              />
            </motion.div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default ResultsPage;
