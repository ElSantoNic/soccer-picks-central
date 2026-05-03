import { useTranslation } from "react-i18next";

interface LeaderboardMember {
  display_name: string;
  avatar_emoji: string;
  points_jornada: number;
  points_total: number;
  badges: string[];
}

interface LeaderboardRowProps {
  rank: number;
  member: LeaderboardMember;
  isCurrentUser: boolean;
  mode?: 'jornada' | 'overall';
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardRow = ({ rank, member, isCurrentUser, mode = 'overall' }: LeaderboardRowProps) => {
  const { t } = useTranslation();
  const primary = mode === 'jornada' ? member.points_jornada : member.points_total;
  const secondary = mode === 'jornada'
    ? `${member.points_total} total`
    : `+${member.points_jornada} pts`;

  return (
    <div className={`flex items-center gap-3 px-4 py-3 transition-colors ${
      isCurrentUser ? 'bg-primary/5 border-l-4 border-primary' : 'border-b border-border'
    }`}>
      <span className="w-8 text-center font-bold text-sm">
        {MEDAL[rank] || rank}
      </span>

      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
        {member.avatar_emoji}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">
          {member.display_name}
          {isCurrentUser && <span className="text-primary ml-1 text-xs">{t('league.you')}</span>}
        </p>
        {member.badges.length > 0 && (
          <p className="text-xs">{member.badges.slice(0, 3).join(' ')}</p>
        )}
      </div>

      <div className="text-right">
        <p className="text-lg font-bold">{primary}</p>
        <p className="text-[10px] text-muted-foreground">{secondary}</p>
      </div>
    </div>
  );
};

export default LeaderboardRow;
