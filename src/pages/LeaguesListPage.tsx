import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Trophy, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

interface League {
  id: string;
  name: string;
  join_code: string | null;
  description: string | null;
  created_at: string;
  created_by: string | null;
  member_count?: number;
}

const LeaguesListPage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinedLeague, setJoinedLeague] = useState<{ id: string; name: string; join_code: string } | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);

  useEffect(() => {
    fetchLeagues();
  }, []);

  const fetchLeagues = async () => {
    const { data, error } = await supabase
      .from('leagues')
      .select('id, name, description, created_at, created_by')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const leaguesWithCounts = await Promise.all(
        data.map(async (league) => {
          const { count } = await supabase
            .from('league_members')
            .select('*', { count: 'exact', head: true })
            .eq('league_id', league.id);

          let join_code: string | null = null;
          if (user && league.created_by === user.id) {
            const { data: codeData } = await supabase
              .rpc('get_league_join_code', { _league_id: league.id });
            join_code = (codeData as string | null) ?? null;
          }

          return { ...league, join_code, member_count: count ?? 0 };
        })
      );
      setLeagues(leaguesWithCounts);
    }
    setLoading(false);
  };

  const handleJoin = async () => {
    const code = joinCode.trim();
    if (!code) return;

    if (!user) {
      toast.error(t("leagues.errSignInToJoin"));
      navigate('/auth');
      return;
    }

    setJoining(true);
    try {
      const { data: found, error: rpcErr } = await supabase
        .rpc('find_league_by_code', { _code: code });

      if (rpcErr) {
        console.error('find_league_by_code error', rpcErr);
        toast.error(t("leagues.errSearch"));
        return;
      }

      const league = Array.isArray(found) ? found[0] : found;
      if (!league) {
        toast.error(t("leagues.errCodeNotFound"));
        return;
      }

      const { error: insertErr } = await supabase
        .from('league_members')
        .insert({
          league_id: league.id,
          user_id: user.id,
          display_name: profile?.display_name || user.email || 'Jugador',
          avatar_emoji: profile?.avatar_emoji || '⚽',
        });

      const isAlreadyMember = !!insertErr && insertErr.code === '23505';
      if (insertErr && !isAlreadyMember) {
        console.error('join league insert error', insertErr);
        toast.error(t("leagues.errJoin"));
        return;
      }

      setJoinCode('');
      setAlreadyMember(isAlreadyMember);
      setJoinedLeague({ id: league.id, name: league.name, join_code: code });
      fetchLeagues();
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">{t("leagues.myLeagues")}</h2>
          <button
            onClick={() => navigate('/league/create')}
            className="bg-primary text-primary-foreground font-bold py-2 px-4 rounded-lg text-sm hover:bg-primary/90 active:scale-95 transition-all"
          >
            {t("leagues.create")}
          </button>
        </div>

        <div className="flex gap-2 mb-6">
          <input
            type="text"
            value={joinCode}
            onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
            placeholder={t("leagues.joinPlaceholder")}
            maxLength={4}
            className="flex-1 px-4 py-2.5 rounded-lg border border-input bg-card text-sm font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={handleJoin}
            disabled={joining}
            className="bg-primary text-primary-foreground font-semibold py-2.5 px-5 rounded-lg text-sm hover:bg-primary/90 transition-all disabled:opacity-60"
          >
            {joining ? t("leagues.joining") : t("leagues.join")}
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">{t("common.loading")}</div>
        ) : leagues.length === 0 ? (
          <div className="text-center py-12">
            <Trophy size={44} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">{t("leagues.emptyTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("leagues.emptyDesc")}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {leagues.map(league => (
              <button
                key={league.id}
                onClick={() => navigate(`/league/${league.id}`)}
                className="w-full bg-card rounded-xl p-4 border border-border text-left hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm">{league.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("leagues.membersCount", { count: league.member_count ?? 0 })}
                      {league.join_code ? t("leagues.withCode", { code: league.join_code }) : ''}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-lg">→</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
      <BottomNav />

      <Dialog
        open={!!joinedLeague}
        onOpenChange={(open) => {
          if (!open) setJoinedLeague(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <div className="flex justify-center mb-2"><PartyPopper size={48} strokeWidth={2.25} className="text-primary" /></div>
            <DialogTitle className="text-center">
              {alreadyMember ? t("leagues.alreadyMemberTitle") : t("leagues.joinedTitle")}
            </DialogTitle>
            <DialogDescription className="text-center">
              {alreadyMember
                ? t("leagues.alreadyMemberDesc")
                : t("leagues.joinedDesc")}
            </DialogDescription>
          </DialogHeader>

          {joinedLeague && (
            <div className="bg-muted/50 rounded-xl p-4 my-2 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {t("leagues.leagueLabel")}
              </p>
              <p className="font-bold text-lg text-foreground mb-3">
                {joinedLeague.name}
              </p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                {t("leagues.joinCodeLabel")}
              </p>
              <p className="font-mono text-2xl tracking-widest text-primary font-bold">
                {joinedLeague.join_code}
              </p>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-col gap-2">
            <button
              onClick={() => {
                if (joinedLeague) navigate(`/league/${joinedLeague.id}`);
              }}
              className="w-full bg-primary text-primary-foreground font-semibold py-2.5 px-4 rounded-lg text-sm hover:bg-primary/90 transition-all"
            >
              {t("leagues.goToLeague")}
            </button>
            <button
              onClick={() => setJoinedLeague(null)}
              className="w-full bg-card border border-border text-foreground font-medium py-2.5 px-4 rounded-lg text-sm hover:bg-muted transition-all"
            >
              {t("common.close")}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LeaguesListPage;
