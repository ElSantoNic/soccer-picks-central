import { Match, TEAM_COLORS } from "@/lib/mockData";

interface MatchCardProps {
  match: Match;
  currentPick: '1' | 'X' | '2' | null;
  isLocked: boolean;
  onPickChange: (matchId: string, pick: '1' | 'X' | '2') => void;
}

const pickLabels = { '1': 'Local', 'X': 'Empate', '2': 'Visitante' } as const;

const TeamBadge = ({ team }: { team: string }) => {
  const color = TEAM_COLORS[team] || '#666';
  return (
    <div className="flex flex-col items-center gap-1 w-24">
      <div
        className="w-10 h-10 rounded-full border-2 border-border shadow-sm flex items-center justify-center text-primary-foreground font-bold text-xs"
        style={{ backgroundColor: color }}
      >
        {team.substring(0, 3).toUpperCase()}
      </div>
      <span className="text-xs font-medium text-center leading-tight line-clamp-2">{team}</span>
    </div>
  );
};

const MatchCard = ({ match, currentPick, isLocked, onPickChange }: MatchCardProps) => {
  const kickoff = new Date(match.kickoff_utc);
  const timeStr = kickoff.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  const dateStr = kickoff.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div className={`bg-card rounded-lg p-4 transition-all border border-border ${isLocked ? 'opacity-75' : ''}`}>
      <div className="flex items-center justify-between mb-3">
        <TeamBadge team={match.home_team} />
        <div className="text-center">
          <span className="text-[10px] text-muted-foreground font-medium uppercase">{dateStr}</span>
          <p className="text-sm font-semibold">{timeStr}</p>
          <span className="text-xs text-muted-foreground">vs</span>
        </div>
        <TeamBadge team={match.away_team} />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {(['1', 'X', '2'] as const).map(pick => {
          const isSelected = currentPick === pick;
          return (
            <button
              key={pick}
              disabled={isLocked}
              onClick={() => onPickChange(match.match_id, pick)}
              className={`py-2.5 rounded-md text-sm font-semibold transition-all ${
                isSelected
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : isLocked
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-secondary text-foreground hover:bg-muted active:scale-95 border border-border'
              }`}
            >
              {isSelected && '✓ '}{pickLabels[pick]}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MatchCard;
