import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, X as XIcon, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatJornadaLabel, type JornadaLike } from "@/lib/jornadaLabel";

interface MemberInfo {
  user_id: string | null;
  display_name: string;
  avatar_emoji: string;
}

interface MatchRow {
  id: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  home_score: number | null;
  away_score: number | null;
  result_1x2: string | null;
}

interface PickRow {
  match_id: string;
  pick: string;
  is_correct: boolean | null;
  points_awarded: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leagueId: string;
  member: MemberInfo | null;
  jornada: (JornadaLike & { id: string; status: string }) | null;
  isSelf: boolean;
}

const PICK_LABEL: Record<string, string> = { "1": "1", X: "X", "2": "2" };

const MemberPicksDialog = ({ open, onOpenChange, leagueId, member, jornada, isSelf }: Props) => {
  const { t } = useTranslation();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [picks, setPicks] = useState<Record<string, PickRow>>({});
  const [loading, setLoading] = useState(false);

  const locked = !!jornada && (jornada.status === "locked" || jornada.status === "complete");
  const canView = isSelf || locked;

  useEffect(() => {
    if (!open || !member?.user_id || !jornada || !canView) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const [matchesRes, picksRes] = await Promise.all([
        supabase
          .from("matches")
          .select("id, home_team, away_team, kickoff_utc, home_score, away_score, result_1x2")
          .eq("jornada_id", jornada.id)
          .order("kickoff_utc", { ascending: true }),
        supabase.rpc("get_member_picks", {
          _league_id: leagueId,
          _user_id: member.user_id,
          _jornada_id: jornada.id,
        }),
      ]);
      if (cancelled) return;
      setMatches((matchesRes.data as MatchRow[]) ?? []);
      const map: Record<string, PickRow> = {};
      ((picksRes.data as PickRow[]) ?? []).forEach((p) => {
        map[p.match_id] = p;
      });
      setPicks(map);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, member?.user_id, jornada?.id, leagueId, canView]);

  const title = member ? t("league.viewPicksFor", { name: member.display_name }) : "";
  const subtitle = jornada ? formatJornadaLabel(t, jornada, "league.jornadaLabel") : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {member && <span className="text-xl">{member.avatar_emoji}</span>}
            {title}
          </DialogTitle>
          <DialogDescription>{subtitle}</DialogDescription>
        </DialogHeader>

        {!canView ? (
          <div className="text-center py-8 text-sm text-muted-foreground">
            <Lock size={28} strokeWidth={2.25} className="mx-auto mb-2" />
            {t("league.picksHiddenUntilLock")}
          </div>
        ) : loading ? (
          <p className="text-center py-8 text-sm text-muted-foreground">{t("common.loading")}</p>
        ) : matches.length === 0 ? (
          <p className="text-center py-8 text-sm text-muted-foreground">
            {t("league.noPicksSubmitted")}
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {matches.map((m) => {
              const p = picks[m.id];
              const hasResult = m.result_1x2 != null;
              return (
                <li key={m.id} className="py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {m.home_team} <span className="text-muted-foreground">vs</span> {m.away_team}
                    </p>
                    {hasResult && (
                      <p className="text-[11px] text-muted-foreground">
                        {m.home_score} – {m.away_score}
                      </p>
                    )}
                  </div>
                  {p ? (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-secondary font-bold text-sm">
                        {PICK_LABEL[p.pick] ?? p.pick}
                      </span>
                      {p.is_correct === true && (
                        <Check size={16} strokeWidth={2.5} className="text-primary" />
                      )}
                      {p.is_correct === false && (
                        <XIcon size={16} strokeWidth={2.5} className="text-destructive" />
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MemberPicksDialog;
