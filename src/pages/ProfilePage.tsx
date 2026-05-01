import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, HelpCircle } from "lucide-react";
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
  const [phoneInput, setPhoneInput] = useState("");
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [savingPhone, setSavingPhone] = useState(false);
  const [savingChannel, setSavingChannel] = useState(false);

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

  const handleSavePhone = async () => {
    if (!user) return;
    const cleaned = phoneInput.trim().replace(/\s/g, "");
    if (cleaned.length < 10) {
      toast.error("Ingresa un número válido");
      return;
    }
    const fullPhone = cleaned.startsWith("+") ? cleaned : `+${cleaned}`;
    setSavingPhone(true);
    const { error } = await supabase
      .from("profiles")
      .update({ phone: fullPhone, notification_channel: "whatsapp" })
      .eq("user_id", user.id);
    setSavingPhone(false);
    if (error) {
      toast.error(error.message || "No se pudo guardar el número");
      return;
    }
    toast.success("¡Número guardado! Recibirás recordatorios por WhatsApp.");
    setShowPhoneInput(false);
    setPhoneInput("");
    refreshProfile();
  };

  const handleToggleWhatsapp = async () => {
    if (!user || !profile?.phone) return;
    const next = profile.notification_channel === "whatsapp" ? "none" : "whatsapp";
    setSavingChannel(true);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_channel: next })
      .eq("user_id", user.id);
    setSavingChannel(false);
    if (error) {
      toast.error("No se pudo actualizar la preferencia");
      return;
    }
    refreshProfile();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-20 bg-background">
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

  const hasPhone = !!profile?.phone;
  const whatsappOn = profile?.notification_channel === "whatsapp";

  return (
    <div className="min-h-screen pb-20 bg-background">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">Perfil</h2>
          <div className="bg-card rounded-xl p-4 space-y-4 border border-border">
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
              <div className="flex bg-secondary rounded-lg overflow-hidden">
                {(["es", "en"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLang(l)}
                    className={`px-4 py-1.5 text-xs font-semibold transition-colors ${
                      lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {!hasPhone && (
          <section>
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <MessageCircle size={24} strokeWidth={2.25} className="text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">
                    Agrega tu número de WhatsApp para recibir recordatorios de la jornada.
                  </p>
                  {showPhoneInput ? (
                    <div className="mt-3 space-y-2">
                      <input
                        type="tel"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                        placeholder="+521234567890"
                        className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleSavePhone}
                          disabled={savingPhone}
                          className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
                        >
                          {savingPhone ? "Guardando..." : "Guardar"}
                        </button>
                        <button
                          onClick={() => { setShowPhoneInput(false); setPhoneInput(""); }}
                          className="px-4 py-2 rounded-lg text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowPhoneInput(true)}
                      className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors"
                    >
                      Agregar número
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-bold uppercase text-muted-foreground mb-3 tracking-wider">
            Avisos y recordatorios
          </h2>
          <div className="bg-card rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <span className="text-sm font-medium block">Recordatorio por WhatsApp</span>
                {!hasPhone && (
                  <span className="text-xs text-muted-foreground">Agrega un número para activarlo</span>
                )}
              </div>
              <button
                onClick={handleToggleWhatsapp}
                disabled={!hasPhone || savingChannel}
                className={`w-11 h-6 rounded-full transition-colors relative ${
                  whatsappOn ? "bg-primary" : "bg-muted"
                } ${!hasPhone ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-card shadow transition-transform ${
                    whatsappOn ? "left-[22px]" : "left-0.5"
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
              const isEarned = false;
              return (
                <div
                  key={badge.type}
                  className={`rounded-xl p-3 text-center transition-all border ${
                    isEarned ? "bg-primary/5 border-primary/30" : "bg-muted/50 border-border opacity-50"
                  }`}
                >
                  {isEarned ? (
                    <span className="text-2xl block mb-1">{badge.emoji}</span>
                  ) : (
                    <HelpCircle size={24} strokeWidth={2.25} className="text-muted-foreground mx-auto mb-1" />
                  )}
                  <p className="text-[10px] font-semibold leading-tight">{badge.name}</p>
                </div>
              );
            })}
          </div>
        </section>

        <button
          onClick={handleSignOut}
          className="w-full py-3 text-destructive font-semibold text-sm rounded-lg border border-destructive/30 hover:bg-destructive/5 transition-colors"
        >
          Cerrar sesión
        </button>
      </main>
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
