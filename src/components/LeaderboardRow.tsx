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
}

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const LeaderboardRow = ({ rank, member, isCurrentUser }: LeaderboardRowProps) => {
  const { t } = useTranslation();
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
        <p className="text-lg font-bold">{member.points_total}</p>
        <p className="text-[10px] text-muted-foreground">+{member.points_jornada} pts</p>
      </div>
    </div>
  );
};

export default LeaderboardRow;
