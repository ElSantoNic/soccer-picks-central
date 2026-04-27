import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type AuthMethod = "email" | "phone" | "password";
type Step = "input" | "otp";

const LoginPage = () => {
  const navigate = useNavigate();
  const { session } = useAuth();

  useEffect(() => {
    if (session) navigate("/picks", { replace: true });
  }, [session, navigate]);

  const [method, setMethod] = useState<AuthMethod>("email");
  const [step, setStep] = useState<Step>("input");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  // Setup-password modal state
  const [setupOpen, setSetupOpen] = useState(false);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
      toast.error("Ingresa correo y contraseña");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success("¡Bienvenido!");
      navigate("/picks");
    } catch (err: any) {
      toast.error(err.message || "Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      if (method === "email") {
        if (!email.trim()) {
          toast.error("Ingresa tu correo electrónico");
          return;
        }
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            emailRedirectTo: `${window.location.origin}/picks`,
          },
        });
        if (error) throw error;
        toast.success("¡Código enviado a tu correo!");
      } else {
        const cleanPhone = phone.trim().replace(/\s/g, "");
        if (!cleanPhone || cleanPhone.length < 10) {
          toast.error("Ingresa un número de teléfono válido");
          return;
        }
        const fullPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
        const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (error) throw error;
        toast.success("¡Código enviado por SMS!");
      }
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || "Error al enviar código");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Ingresa el código de 6 dígitos");
      return;
    }
    setLoading(true);
    try {
      const params =
        method === "email"
          ? { email: email.trim(), token: otp, type: "email" as const }
          : { phone: phone.trim().startsWith("+") ? phone.trim() : `+${phone.trim()}`, token: otp, type: "sms" as const };

      const { error } = await supabase.auth.verifyOtp(params);
      if (error) throw error;
      toast.success("¡Bienvenido!");
      navigate("/picks");
    } catch (err: any) {
      toast.error(err.message || "Código incorrecto");
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async () => {
    if (!setupEmail.trim() || !setupPassword || !setupSecret) {
      toast.error("Completa todos los campos");
      return;
    }
    if (setupPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    setSetupLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-set-password", {
        body: {
          email: setupEmail.trim(),
          newPassword: setupPassword,
          setupSecret: setupSecret,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      toast.success("¡Contraseña configurada! Inicia sesión.");
      setMethod("password");
      setEmail(setupEmail.trim());
      setPassword(setupPassword);
      setSetupOpen(false);
      setSetupSecret("");
      setSetupPassword("");
    } catch (err: any) {
      toast.error(err.message || "Error al configurar contraseña");
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">FC Quiniela</h1>
          <p className="text-muted-foreground text-sm">Inicia sesión para guardar tus picks y competir</p>
        </div>

        <div className="bg-card rounded-2xl p-6 border border-border">
          {step === "input" ? (
            <>
              <div className="grid grid-cols-3 bg-secondary rounded-lg overflow-hidden mb-6">
                <button
                  onClick={() => setMethod("email")}
                  className={`py-2.5 text-xs font-semibold transition-colors ${
                    method === "email" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  📧 Correo
                </button>
                <button
                  onClick={() => setMethod("phone")}
                  className={`py-2.5 text-xs font-semibold transition-colors ${
                    method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  📱 SMS
                </button>
                <button
                  onClick={() => setMethod("password")}
                  className={`py-2.5 text-xs font-semibold transition-colors ${
                    method === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  🔑 Clave
                </button>
              </div>

              {method === "email" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">Correo electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@correo.com"
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              )}

              {method === "phone" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    Número de teléfono (con código de país)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+521234567890"
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              )}

              {method === "password" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Correo electrónico</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Contraseña</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      onKeyDown={(e) => e.key === "Enter" && handlePasswordLogin()}
                    />
                  </div>
                </div>
              )}

              <button
                onClick={method === "password" ? handlePasswordLogin : handleSendOtp}
                disabled={loading}
                className="w-full mt-4 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading
                  ? method === "password"
                    ? "Iniciando..."
                    : "Enviando..."
                  : method === "password"
                    ? "Iniciar sesión"
                    : "Enviar código"}
              </button>

              {method === "password" && (
                <button
                  onClick={() => setSetupOpen(true)}
                  className="w-full mt-3 py-2 text-xs text-primary hover:underline transition-colors"
                >
                  ¿Primera vez? Configurar contraseña
                </button>
              )}

              <button
                onClick={() => navigate("/picks")}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Continuar sin cuenta →
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                Ingresa el código de 6 dígitos enviado a{" "}
                <span className="font-semibold text-foreground">
                  {method === "email" ? email : phone}
                </span>
              </p>

              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                className="w-full px-4 py-4 rounded-lg border border-input bg-background text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleVerifyOtp()}
              />

              <button
                onClick={handleVerifyOtp}
                disabled={loading}
                className="w-full mt-4 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Verificando..." : "Verificar"}
              </button>

              <button
                onClick={() => { setStep("input"); setOtp(""); }}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Cambiar {method === "email" ? "correo" : "número"}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Sin contraseñas. Solo un código de verificación.
        </p>
      </div>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar contraseña</DialogTitle>
            <DialogDescription>
              Solo disponible para el correo autorizado. Necesitas el secret de configuración.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Correo</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Nueva contraseña (mín 8)</label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Setup secret</label>
              <input
                type="password"
                value={setupSecret}
                onChange={(e) => setSetupSecret(e.target.value)}
                placeholder="ADMIN_PASSWORD_SETUP_SECRET"
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={handleSetupPassword}
              disabled={setupLoading}
              className="w-full mt-2 py-3 rounded-lg bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {setupLoading ? "Configurando..." : "Configurar contraseña"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
