import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PartyPopper, MessageCircle, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const CreateLeaguePage = () => {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [joinCode, setJoinCode] = useState(
    String(Math.floor(1000 + Math.random() * 9000))
  );
  const [showShare, setShowShare] = useState(false);
  const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Ingresa un nombre para tu quiniela");
      return;
    }
    if (joinCode.length !== 4) {
      toast.error("El código debe tener 4 dígitos");
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
        toast.error("Ese código ya está en uso. Prueba otro.");
      } else {
        toast.error("Error al crear la quiniela");
      }
      return;
    }

    if (user && data) {
      await supabase.from("league_members").insert({
        league_id: data.id,
        user_id: user.id,
        display_name: profile?.display_name || user.email || user.phone || "Organizador",
        avatar_emoji: profile?.avatar_emoji || "⚽",
      });
    }

    setSaving(false);
    setCreatedLeagueId(data.id);
    setShowShare(true);
  };

  const inviteUrl = `fcquiniela.app/l/${joinCode}`;
  const inviteMsg = `¡Únete a mi quiniela "${name}" en FC Quiniela! Haz tus picks aquí: ${inviteUrl}`;

  if (showShare) {
    return (
      <div className="min-h-screen pb-20 bg-background">
        <TopBar />
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-card rounded-xl p-6 border border-border text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <PartyPopper size={22} strokeWidth={2.25} className="text-primary" />
              <h2 className="text-xl font-bold">¡Quiniela creada!</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              Comparte tu quiniela con familia y amigos
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
                Compartir por WhatsApp
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success("¡Enlace copiado!");
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-secondary border border-border font-semibold hover:bg-muted transition-all"
              >
                <Copy size={18} strokeWidth={2.25} />
                Copiar enlace
              </button>
            </div>
            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Código de acceso</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{joinCode}</p>
            </div>
            <button
              onClick={() => navigate(`/league/${createdLeagueId}`)}
              className="mt-6 text-sm text-primary font-semibold hover:underline"
            >
              Ir a mi quiniela →
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
        <h2 className="text-xl font-bold mb-6">Crear quiniela</h2>
        {!user && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-4 text-sm">
            <button onClick={() => navigate("/auth")} className="text-primary font-semibold underline">
              Inicia sesión
            </button>{" "}
            para que tu quiniela quede vinculada a tu cuenta.
          </div>
        )}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Nombre de tu quiniela *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Quiniela Familia García"
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Solo familia, sin dinero..."
              rows={2}
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Código de acceso (4 dígitos)</label>
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
            {saving ? "Creando..." : "Crear quiniela"}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default CreateLeaguePage;
