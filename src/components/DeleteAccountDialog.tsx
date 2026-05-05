import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, ArrowRightLeft, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface OwnedLeague {
  league_id: string;
  name: string;
  member_count: number;
  can_solo_delete: boolean;
}

interface Member {
  user_id: string | null;
  display_name: string;
  avatar_emoji: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted: () => void;
}

type View =
  | { kind: "list" }
  | { kind: "transfer"; league: OwnedLeague }
  | { kind: "confirmDelete"; league: OwnedLeague };

const DeleteAccountDialog = ({ open, onOpenChange, onDeleted }: Props) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [owned, setOwned] = useState<OwnedLeague[]>([]);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [view, setView] = useState<View>({ kind: "list" });

  // Transfer state
  const [transferMembers, setTransferMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [deletingLeague, setDeletingLeague] = useState(false);

  const loadOwned = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_owned_leagues_blocking_deletion");
    setLoading(false);
    if (error) {
      console.error("get_owned_leagues_blocking_deletion error:", error);
      toast.error(t("deleteAccount.errLoad"));
      return;
    }
    setOwned((data ?? []) as OwnedLeague[]);
  };

  useEffect(() => {
    if (open) {
      setConfirmText("");
      setView({ kind: "list" });
      loadOwned();
    }
  }, [open]);

  const openTransfer = async (league: OwnedLeague) => {
    setSelectedMember("");
    setTransferMembers([]);
    setView({ kind: "transfer", league });
    const { data, error } = await supabase
      .from("league_members")
      .select("user_id, display_name, avatar_emoji")
      .eq("league_id", league.league_id);
    if (error) {
      console.error("league_members fetch error:", error);
      toast.error(t("deleteAccount.errLoad"));
      return;
    }
    const others = (data ?? []).filter(
      (m: any) => m.user_id && m.user_id !== user?.id,
    ) as Member[];
    setTransferMembers(others);
  };

  const handleTransfer = async () => {
    if (view.kind !== "transfer" || !selectedMember) return;
    setTransferring(true);
    const { error } = await supabase.rpc("transfer_league_ownership", {
      _league_id: view.league.league_id,
      _new_owner: selectedMember,
    });
    setTransferring(false);
    if (error) {
      console.error("transfer_league_ownership error:", error);
      toast.error(t("deleteAccount.errTransfer"));
      return;
    }
    toast.success(t("deleteAccount.okTransfer", "Ownership transferred"));
    setView({ kind: "list" });
    await loadOwned();
  };

  const handleDeleteLeague = async (league: OwnedLeague) => {
    setDeletingLeague(true);
    const { error } = await supabase.rpc("delete_league", { _league_id: league.league_id });
    setDeletingLeague(false);
    if (error) {
      console.error("delete_league error:", error);
      toast.error(`${t("deleteAccount.errDeleteLeague")}: ${error.message}`);
      return;
    }
    toast.success(t("deleteAccount.okDeleteLeague", "League deleted"));
    setView({ kind: "list" });
    await loadOwned();
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    const { data, error } = await supabase.functions.invoke("delete-account", { method: "POST" });
    setDeleting(false);
    if (error || (data as any)?.error) {
      console.error("delete-account error:", error, data);
      if ((data as any)?.error === "owned_leagues") {
        await loadOwned();
        return;
      }
      toast.error(t("deleteAccount.errDelete"));
      return;
    }
    toast.success(t("deleteAccount.success"));
    onDeleted();
  };

  const canDelete = owned.length === 0 && confirmText.trim() === "DELETE";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle size={20} />
            {view.kind === "transfer"
              ? t("deleteAccount.transferTitle")
              : t("deleteAccount.title")}
          </DialogTitle>
          <DialogDescription>
            {view.kind === "transfer"
              ? t("deleteAccount.transferDesc", { name: view.league.name })
              : t("deleteAccount.warning")}
          </DialogDescription>
        </DialogHeader>

        {view.kind === "transfer" ? (
          <div className="space-y-3">
            {transferMembers.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("deleteAccount.noOtherMembers")}</p>
            ) : (
              <ul className="space-y-1 max-h-64 overflow-y-auto">
                {transferMembers.map((m) => (
                  <li key={m.user_id ?? ""}>
                    <button
                      onClick={() => setSelectedMember(m.user_id ?? "")}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-colors ${
                        selectedMember === m.user_id
                          ? "bg-primary/10 border border-primary"
                          : "border border-border hover:bg-muted"
                      }`}
                    >
                      <span className="text-lg">{m.avatar_emoji}</span>
                      <span className="font-medium">{m.display_name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setView({ kind: "list" })}
                className="flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                <ArrowLeft size={14} />
                {t("common.back", "Back")}
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedMember || transferring}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {t("deleteAccount.confirmTransfer")}
              </button>
            </div>
          </div>
        ) : loading ? (
          <p className="text-sm text-muted-foreground py-4">{t("deleteAccount.loading")}</p>
        ) : owned.length > 0 ? (
          <div className="space-y-3">
            <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
              <p className="text-sm font-semibold text-foreground">{t("deleteAccount.ownedLeaguesTitle")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("deleteAccount.ownedLeaguesDesc")}</p>
            </div>
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {owned.map((l) => {
                const isConfirming = view.kind === "confirmDelete" && view.league.league_id === l.league_id;
                return (
                  <li key={l.league_id} className="border border-border rounded-lg p-3 space-y-2">
                    <div>
                      <p className="text-sm font-semibold">{l.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {t("deleteAccount.members", { count: l.member_count })}
                      </p>
                    </div>
                    {isConfirming ? (
                      <div className="space-y-2">
                        <p className="text-xs text-destructive">
                          {t("deleteAccount.confirmDeleteLeague", { name: l.name })}
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setView({ kind: "list" })}
                            disabled={deletingLeague}
                            className="flex-1 py-1.5 rounded-md text-xs font-semibold border border-border hover:bg-muted transition-colors disabled:opacity-50"
                          >
                            {t("deleteAccount.cancel")}
                          </button>
                          <button
                            onClick={() => handleDeleteLeague(l)}
                            disabled={deletingLeague}
                            className="flex-1 py-1.5 rounded-md text-xs font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50"
                          >
                            {deletingLeague ? t("deleteAccount.deleting") : t("deleteAccount.deleteLeague")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        {!l.can_solo_delete && (
                          <button
                            onClick={() => openTransfer(l)}
                            className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md border border-border hover:bg-muted transition-colors"
                          >
                            <ArrowRightLeft size={14} />
                            {t("deleteAccount.transfer")}
                          </button>
                        )}
                        <button
                          onClick={() => setView({ kind: "confirmDelete", league: l })}
                          className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                        >
                          <Trash2 size={14} />
                          {t("deleteAccount.deleteLeague")}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                {t("deleteAccount.cancel")}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs text-muted-foreground block">
              {t("deleteAccount.typedConfirmLabel")}
            </label>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="DELETE"
            />
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onOpenChange(false)}
                className="flex-1 py-2 rounded-lg text-sm font-semibold border border-border hover:bg-muted transition-colors"
              >
                {t("deleteAccount.cancel")}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={!canDelete || deleting}
                className="flex-1 py-2 rounded-lg text-sm font-semibold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? t("deleteAccount.deleting") : t("deleteAccount.confirmDelete")}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DeleteAccountDialog;
