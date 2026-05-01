import { useTranslation } from "react-i18next";
import { TEAM_COLORS } from "@/lib/mockData";

interface ResultCardProps {
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  userPick: '1' | 'X' | '2' | null;
  isCorrect: boolean;
}

const ResultCard = ({ homeTeam, awayTeam, homeScore, awayScore, userPick, isCorrect }: ResultCardProps) => {
  const { t } = useTranslation();
  const homeColor = TEAM_COLORS[homeTeam] || '#666';
  const awayColor = TEAM_COLORS[awayTeam] || '#666';

  const pickLabels: Record<'1' | 'X' | '2', string> = {
    '1': t('picks.labelLocal'),
    'X': t('picks.labelDraw'),
    '2': t('picks.labelAway'),
  };

  return (
    <div className={`bg-card rounded-lg p-4 border ${isCorrect ? 'border-l-4 border-success' : 'border-l-4 border-destructive'}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: homeColor }}>
            {homeTeam.substring(0, 3).toUpperCase()}
          </div>
          <span className="text-sm font-medium truncate">{homeTeam}</span>
        </div>

        <div className="flex items-center gap-1 px-3">
          <span className="text-xl font-bold">{homeScore}</span>
          <span className="text-muted-foreground text-sm">–</span>
          <span className="text-xl font-bold">{awayScore}</span>
        </div>

        <div className="flex items-center gap-2 flex-1 justify-end">
          <span className="text-sm font-medium truncate text-right">{awayTeam}</span>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold text-primary-foreground" style={{ backgroundColor: awayColor }}>
            {awayTeam.substring(0, 3).toUpperCase()}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <span className="text-xs text-muted-foreground">
          {t('results.yourPick')} <span className="font-semibold text-foreground">{userPick ? pickLabels[userPick] : '—'}</span>
        </span>
        <span className={`text-sm font-bold ${isCorrect ? 'text-success' : 'text-destructive'}`}>
          {isCorrect ? t('results.correct') : t('results.incorrect')}
        </span>
      </div>
    </div>
  );
};

export default ResultCard;
