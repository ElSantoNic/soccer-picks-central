import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Frown, Share2, BarChart3, Users, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import LeaderboardRow from "@/components/LeaderboardRow";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LeagueMember {
  id: string;
  user_id: string | null;
  display_name: string;
  avatar_emoji: string;
  points_jornada: number;
  points_total: number;
  badges: string[];
}

interface League {
  id: string;
  name: string;
  join_code: string | null;
  description: string | null;
  created_by: string | null;
}

const LeaguePage = () => {
  const { leagueId } = useParams<{ leagueId: string }>();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'tabla' | 'miembros'>('tabla');
  const [standingsView, setStandingsView] = useState<'jornada' | 'overall'>('jornada');
  const [currentJornada, setCurrentJornada] = useState<{ jornada_number: number; season: string } | null>(null);
  const [league, setLeague] = useState<League | null>(null);
  const [members, setMembers] = useState<LeagueMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToRemove, setMemberToRemove] = useState<LeagueMember | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!leagueId) return;
    const fetchData = async () => {
      const [leagueRes, membersRes, jornadaRes] = await Promise.all([
        supabase
          .from('leagues')
          .select('id, name, description, created_by')
          .eq('id', leagueId)
          .single(),
        supabase.from('league_members').select('*').eq('league_id', leagueId),
        supabase
          .from('jornadas')
          .select('jornada_number, season')
          .order('jornada_number', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (leagueRes.data) {
        let join_code: string | null = null;
        if (user && leagueRes.data.created_by === user.id) {
          const { data: codeData } = await supabase
            .rpc('get_league_join_code', { _league_id: leagueRes.data.id });
          join_code = (codeData as string | null) ?? null;
        }
        setLeague({ ...leagueRes.data, join_code });
      }
      if (membersRes.data) setMembers(membersRes.data as LeagueMember[]);
      if (jornadaRes.data) setCurrentJornada(jornadaRes.data);
      setLoading(false);
    };
    fetchData();
  }, [leagueId, user]);

  const isCreator = !!user && !!league && user.id === league.created_by;

  const handleConfirmRemove = async () => {
    if (!memberToRemove) return;
    setRemoving(true);
    const { error } = await supabase
      .from('league_members')
      .delete()
      .eq('id', memberToRemove.id);
    setRemoving(false);

    if (error) {
      toast({ title: t("league.removeError"), variant: "destructive" });
      return;
    }
    setMembers(prev => prev.filter(m => m.id !== memberToRemove.id));
    toast({ title: t("league.removeSuccess") });
    setMemberToRemove(null);
  };

  const sorted = [...members].sort((a, b) => b.points_total - a.points_total);

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <div className="text-center py-20 text-muted-foreground text-sm">{t("common.loading")}</div>
        <BottomNav />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <div className="text-center py-20">
          <Frown size={44} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-3" />
          <p className="font-semibold">{t("league.notFound")}</p>
        </div>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />

      <main className="max-w-lg mx-auto">
        <div className="bg-card border-b border-border px-4 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">{league.name}</h2>
              <p className="text-xs text-muted-foreground">
                {t("leagues.membersCount", { count: members.length })}
                {league.join_code ? t("leagues.withCode", { code: league.join_code }) : ''}
              </p>
            </div>
            <button className="p-2 hover:bg-secondary rounded-full transition-colors text-foreground" aria-label={t("league.share")}>
              <Share2 size={20} strokeWidth={2.25} />
            </button>
          </div>
        </div>

        <div className="flex border-b border-border bg-card">
          {(['tabla', 'miembros'] as const).map(tab => {
            const Icon = tab === 'tabla' ? BarChart3 : Users;
            const label = tab === 'tabla' ? t("league.tabTable") : t("league.tabMembers");
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? 'text-primary border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon size={16} strokeWidth={2.25} />
                {label}
              </button>
            );
          })}
        </div>

        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users size={44} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-3" />
            <p className="font-semibold mb-1">{t("league.noMembersTitle")}</p>
            <p className="text-sm text-muted-foreground">{t("league.noMembersDesc")}</p>
          </div>
        ) : activeTab === 'tabla' ? (
          <div className="bg-card">
            {sorted.map((member, i) => (
              <LeaderboardRow
                key={member.id}
                rank={i + 1}
                member={member}
                isCurrentUser={false}
              />
            ))}
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {members.map(member => {
              const canRemove = isCreator && member.user_id !== league.created_by;
              return (
                <div key={member.id} className="flex items-center gap-3 bg-card p-3 rounded-lg border border-border">
                  <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-xl">
                    {member.avatar_emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{member.display_name}</p>
                    <p className="text-xs text-muted-foreground">{t("league.totalPoints", { n: member.points_total })}</p>
                  </div>
                  {canRemove && (
                    <button
                      onClick={() => setMemberToRemove(member)}
                      className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      aria-label={t("league.removeMember")}
                    >
                      <Trash2 size={18} strokeWidth={2.25} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog open={!!memberToRemove} onOpenChange={(open) => !open && setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("league.removeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("league.removeConfirmDesc", {
                name: memberToRemove?.display_name ?? '',
                league: league.name,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleConfirmRemove(); }}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("league.removeMember")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

export default LeaguePage;
