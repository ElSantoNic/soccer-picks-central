import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { BADGE_DEFINITIONS } from "@/lib/mockData";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, profile, loading, signOut, refreshProfile } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [lang, setLang] = useState<"es" | "en">("es");
  const [whatsappReminder, setWhatsappReminder] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
    }
  }, [profile]);

  const handleSaveName = async () => {
    if (!user) return;
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() })
      .eq("user_id", user.id);
    if (!error) {
      toast.success("Nombre guardado");
      refreshProfile();
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20">
        <TopBar />
        <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">Cargando...</div>
        <BottomNav />
      </div>
    );
  }

  if (!user) return null;

  const maskedContact = user.email
    ? user.email.replace(/(.{2})(.*)(@.*)/, "$1•••$3")
    : user.phone
      ? user.phone.replace(/(.{4})(.*)(.{4})/, "$1 ••• $3")
      : "";

  return (
    <div className="min-h-screen pb-20">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Perfil</h2>
          <div className="bg-card rounded-xl p-4 space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">Nombre</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onBlur={handleSaveName}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">
                {user.email ? "Correo" : "Teléfono"}
              </label>
              <p className="text-sm font-medium mt-1">{maskedContact}</p>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Idioma</span>
              <div className="flex bg-soft-gray rounded-lg overflow-hidden">
                {(["es", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      lang === l ? "bg-electric-blue text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">
            Avisos y recordatorios
          </h2>
          <div className="bg-card rounded-xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Recordatorio por WhatsApp</span>
              <button
                onClick={() => setWhatsappReminder(!whatsappReminder)}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  whatsappReminder ? "bg-electric-blue" : "bg-muted"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                    whatsappReminder ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Mis logros</h2>
          <div className="grid grid-cols-3 gap-3">
            {BADGE_DEFINITIONS.map((badge) => {
              const isEarned = false; // TODO: pull from user data
              return (
                <div
                  key={badge.type}
                  className={`rounded-xl p-3 text-center transition-all ${
                    isEarned ? "bg-amber/10 border border-amber/30" : "bg-muted/50 opacity-50"
                  }`}
                >
                  <span className="text-2xl block mb-1">{isEarned ? badge.emoji : "❓"}</span>
                  <p className="text-[10px] font-semibold leading-tight">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="w-full py-3 text-coral font-semibold text-sm rounded-lg border border-coral/30 hover:bg-coral/10 transition-colors"
        >
          Cerrar sesión
        </button>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
