import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { PartyPopper, MessageCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const CreateLeaguePage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState(
    String(Math.floor(1000 + Math.random() * 9000))
  );
  const [showShare, setShowShare] = useState(false);
  const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (!trimmedName) {
      toast.error(t("createLeague.errName"));
      return;
    }
    if (trimmedName.length > 100) {
      toast.error(t("createLeague.errNameTooLong", "Name must be 100 characters or fewer"));
      return;
    }
    if (trimmedDesc.length > 300) {
      toast.error(t("createLeague.errDescTooLong", "Description must be 300 characters or fewer"));
      return;
    }
    if (joinCode.length !== 4) {
      toast.error(t("createLeague.errCodeLength"));
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from("leagues")
      .insert({
        name: name.trim(),
        description: description.trim() || null,
        join_code: joinCode,
        created_by: user?.id || null,
      })
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      if (error.code === "23505") {
        toast.error(t("createLeague.errCodeTaken"));
      } else {
        toast.error(t("createLeague.errCreate"));
      }
      return;
    }

    if (user && data) {
      await supabase.from("league_members").insert({
        league_id: data.id,
        user_id: user.id,
        display_name: profile?.display_name || "Organizador",
        avatar_emoji: profile?.avatar_emoji || "⚽",
      });
    }

    setSaving(false);
    setCreatedLeagueId(data.id);
    setShowShare(true);
  };

  const inviteUrl = `fcquiniela.app/l/${joinCode}`;
  const inviteMsg = t("createLeague.inviteMessage", { name, url: inviteUrl });

  if (showShare) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <PartyPopper size={22} strokeWidth={2.25} className="text-primary" />
              <h2 className="text-xl font-bold">{t("createLeague.createdTitle")}</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              {t("createLeague.createdSub")}
            </p>
            <div className="bg-secondary rounded-lg p-3 mb-6 text-sm font-mono break-all">
              {inviteUrl}
            </div>
            <div className="space-y-3 mb-6">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#25D366] text-primary-foreground font-semibold hover:brightness-110 transition-all"
              >
                <MessageCircle size={18} strokeWidth={2.25} />
                {t("createLeague.shareWhatsapp")}
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success(t("createLeague.linkCopied"));
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-secondary border border-border font-semibold hover:bg-muted transition-all"
              >
                <Copy size={18} strokeWidth={2.25} />
                {t("createLeague.copyLink")}
              </button>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">{t("createLeague.joinCodeLabel")}</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{joinCode}</p>
            </div>
            <button
              onClick={() => navigate(`/league/${createdLeagueId}`)}
              className="mt-6 text-sm text-primary font-semibold hover:underline"
            >
              {t("createLeague.goToMyLeague")}
            </button>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-6">{t("createLeague.title")}</h2>
        {!user && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 text-sm">
            <button onClick={() => navigate("/auth")} className="text-primary font-semibold underline">
              {t("createLeague.loginPromptLink")}
            </button>
            {t("createLeague.loginPromptPost")}
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">{t("createLeague.labelName")}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("createLeague.placeholderName")}
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">{t("createLeague.labelDesc")}</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createLeague.placeholderDesc")}
              rows={2}
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">{t("createLeague.labelCode")}</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3.5 rounded-lg bg-primary text-primary-foreground font-bold text-lg hover:bg-primary/90 active:scale-[0.98] transition-all mt-2 disabled:opacity-50"
          >
            {saving ? t("createLeague.creating") : t("createLeague.create")}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default CreateLeaguePage;
