import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trophy, PartyPopper } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";

interface FoundLeague {
  id: string;
  name: string;
  join_code: string;
}

const JoinLeaguePage = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [league, setLeague] = useState<FoundLeague | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!joinCode) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.rpc("find_league_by_code", { _code: joinCode });
      if (cancelled) return;
      const found = Array.isArray(data) ? data[0] : data;
      if (error || !found) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setLeague(found as FoundLeague);

      // Already a member? Redirect straight to league page.
      if (user) {
        const { data: existing } = await supabase
          .from("league_members")
          .select("id")
          .eq("league_id", (found as FoundLeague).id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (existing) {
          navigate(`/league/${(found as FoundLeague).id}`, { replace: true });
          return;
        }
      }
      setLoading(false);
    };
    if (!authLoading) run();
    return () => {
      cancelled = true;
    };
  }, [joinCode, user, authLoading, navigate]);

  const handleJoin = async () => {
    if (!league || !joinCode) return;
    if (!user) {
      sessionStorage.setItem("pendingJoinCode", joinCode);
      navigate("/auth");
      return;
    }
    setJoining(true);
    try {
      const { error } = await supabase.from("league_members").insert({
        league_id: league.id,
        user_id: user.id,
        display_name: profile?.display_name || "Jugador",
        avatar_emoji: profile?.avatar_emoji || "⚽",
      });
      if (error && error.code !== "23505") {
        console.error("join league insert error", error);
        toast.error(t("leagues.errJoin"));
        return;
      }
      navigate(`/league/${league.id}`, { replace: true });
    } finally {
      setJoining(false);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="max-w-lg mx-auto px-4 py-12 text-center text-sm text-muted-foreground">
          {t("common.loading")}
        </main>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-background">
        <TopBar />
        <main className="max-w-lg mx-auto px-4 py-10">
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <Trophy size={44} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-3" />
            <h2 className="text-lg font-bold mb-2">{t("joinLeague.notFoundTitle")}</h2>
            <p className="text-sm text-muted-foreground mb-5">{t("joinLeague.notFoundDesc")}</p>
            <button
              onClick={() => navigate("/")}
              className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all"
            >
              {t("joinLeague.goHome")}
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-10">
        <div className="bg-card rounded-xl p-6 border border-border text-center">
          <div className="flex justify-center mb-3">
            <PartyPopper size={44} strokeWidth={2.25} className="text-primary" />
          </div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
            {t("joinLeague.title")}
          </p>
          <h2 className="text-2xl font-bold mb-2">{league?.name}</h2>
          <p className="text-sm text-muted-foreground mb-6">{t("joinLeague.subtitle")}</p>

          {!user && (
            <p className="text-xs text-muted-foreground mb-3">{t("joinLeague.signInPrompt")}</p>
          )}

          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {joining ? t("joinLeague.joining") : t("joinLeague.joinCta")}
          </button>
        </div>
      </main>
    </div>
  );
};

export default JoinLeaguePage;
