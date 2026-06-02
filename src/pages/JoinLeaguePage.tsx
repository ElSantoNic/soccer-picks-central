import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Trophy, PartyPopper, Loader2, AlertCircle, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";

interface FoundLeague {
  id: string;
  name: string;
  join_code: string;
}

type Status = "loading" | "ready" | "not_found" | "error";

const PageShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-background">
    <TopBar />
    <main className="max-w-lg mx-auto px-4 py-10">{children}</main>
  </div>
);

const JoinLeaguePage = () => {
  const { joinCode } = useParams<{ joinCode: string }>();
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [status, setStatus] = useState<Status>("loading");
  const [league, setLeague] = useState<FoundLeague | null>(null);
  const [joining, setJoining] = useState(false);
  const [fetchTick, setFetchTick] = useState(0);

  const retry = useCallback(() => {
    setStatus("loading");
    setFetchTick((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!joinCode) {
        setStatus("not_found");
        return;
      }
      const { data, error } = await supabase.rpc("find_league_by_code", { _code: joinCode });
      if (cancelled) return;
      if (error) {
        console.error("find_league_by_code error", error);
        setStatus("error");
        return;
      }
      const found = Array.isArray(data) ? data[0] : data;
      if (!found) {
        setStatus("not_found");
        return;
      }
      setLeague(found as FoundLeague);

      if (user) {
        const { data: existing, error: memErr } = await supabase
          .from("league_members")
          .select("id")
          .eq("league_id", (found as FoundLeague).id)
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        if (memErr) {
          console.error("league_members lookup error", memErr);
          setStatus("error");
          return;
        }
        if (existing) {
          navigate(`/league/${(found as FoundLeague).id}`, { replace: true });
          return;
        }
      }
      setStatus("ready");
    };
    if (!authLoading) run();
    return () => {
      cancelled = true;
    };
  }, [joinCode, user, authLoading, navigate, fetchTick]);

  const handleJoin = async () => {
    if (!league || !joinCode) return;
    if (!user) {
      sessionStorage.setItem("pendingJoinUrl", `/l/${joinCode}`);
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

  if (authLoading || status === "loading") {
    return (
      <PageShell>
        <div
          role="status"
          aria-live="polite"
          className="bg-card rounded-xl p-8 border border-border flex flex-col items-center justify-center text-center"
        >
          <Loader2 size={36} className="text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">{t("joinLeague.searching")}</p>
        </div>
      </PageShell>
    );
  }

  if (status === "not_found") {
    return (
      <PageShell>
        <div className="bg-card rounded-xl p-6 border border-border text-center">
          <Trophy size={44} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">{t("joinLeague.notFoundTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-2">{t("joinLeague.notFoundDesc")}</p>
          {joinCode && (
            <p className="text-xs font-mono text-muted-foreground mb-5">
              {t("joinLeague.notFoundCode", { code: joinCode })}
            </p>
          )}
          <button
            onClick={() => navigate("/")}
            className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all"
          >
            {t("joinLeague.goHome")}
          </button>
        </div>
      </PageShell>
    );
  }

  if (status === "error") {
    return (
      <PageShell>
        <div className="bg-card rounded-xl p-6 border border-destructive/40 text-center">
          <AlertCircle size={44} strokeWidth={2.25} className="text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">{t("joinLeague.networkErrorTitle")}</h2>
          <p className="text-sm text-muted-foreground mb-5">{t("joinLeague.networkErrorDesc")}</p>
          <div className="flex gap-2">
            <button
              onClick={retry}
              className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-all inline-flex items-center justify-center gap-2"
            >
              <RotateCw size={16} />
              {t("joinLeague.retry")}
            </button>
            <button
              onClick={() => navigate("/")}
              className="flex-1 py-3 rounded-lg bg-muted text-foreground font-bold hover:bg-muted/80 transition-all"
            >
              {t("joinLeague.goHome")}
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
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
          className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 inline-flex items-center justify-center gap-2"
        >
          {joining && <Loader2 size={18} className="animate-spin" />}
          {joining ? t("joinLeague.joining") : t("joinLeague.joinCta")}
        </button>
      </div>
    </PageShell>
  );
};

export default JoinLeaguePage;
