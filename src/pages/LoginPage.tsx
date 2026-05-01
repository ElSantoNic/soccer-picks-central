import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();

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

  const [setupOpen, setSetupOpen] = useState(false);
  const [setupEmail, setSetupEmail] = useState("");
  const [setupPassword, setSetupPassword] = useState("");
  const [setupSecret, setSetupSecret] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  const handlePasswordLogin = async () => {
    if (!email.trim() || !password) {
      toast.error(t("auth.errEmailPassword"));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      toast.success(t("auth.okWelcome"));
      navigate("/picks");
    } catch (err: any) {
      toast.error(err.message || t("auth.errInvalidCreds"));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/picks` },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || t("auth.errGoogle"));
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      if (method === "email") {
        if (!email.trim()) {
          toast.error(t("auth.errEmailRequired"));
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
        toast.success(t("auth.okEmailSent"));
      } else {
        const cleanPhone = phone.trim().replace(/\s/g, "");
        if (!cleanPhone || cleanPhone.length < 10) {
          toast.error(t("auth.errPhoneInvalid"));
          return;
        }
        const fullPhone = cleanPhone.startsWith("+") ? cleanPhone : `+${cleanPhone}`;
        const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
        if (error) throw error;
        toast.success(t("auth.okSmsSent"));
      }
      setStep("otp");
    } catch (err: any) {
      toast.error(err.message || t("auth.errSendCode"));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error(t("auth.errOtpLength"));
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
      toast.success(t("auth.okWelcome"));
      navigate("/picks");
    } catch (err: any) {
      toast.error(err.message || t("auth.errOtpInvalid"));
    } finally {
      setLoading(false);
    }
  };

  const handleSetupPassword = async () => {
    if (!setupEmail.trim() || !setupPassword || !setupSecret) {
      toast.error(t("auth.errCompleteFields"));
      return;
    }
    if (setupPassword.length < 8) {
      toast.error(t("auth.errPasswordLength"));
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

      toast.success(t("auth.okPasswordSet"));
      setMethod("password");
      setEmail(setupEmail.trim());
      setPassword(setupPassword);
      setSetupOpen(false);
      setSetupSecret("");
      setSetupPassword("");
    } catch (err: any) {
      toast.error(err.message || t("auth.errSetupPassword"));
    } finally {
      setSetupLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("topbar.appName")}</h1>
          <p className="text-muted-foreground text-sm">{t("auth.subtitle")}</p>
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
                  {t("auth.tabEmail")}
                </button>
                <button
                  onClick={() => setMethod("phone")}
                  className={`py-2.5 text-xs font-semibold transition-colors ${
                    method === "phone" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t("auth.tabSms")}
                </button>
                <button
                  onClick={() => setMethod("password")}
                  className={`py-2.5 text-xs font-semibold transition-colors ${
                    method === "password" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                >
                  {t("auth.tabPassword")}
                </button>
              </div>

              {method === "email" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.labelEmail")}</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("auth.placeholderEmail")}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              )}

              {method === "phone" && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1.5 block">
                    {t("auth.labelPhone")}
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t("auth.placeholderPhone")}
                    className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    onKeyDown={(e) => e.key === "Enter" && handleSendOtp()}
                  />
                </div>
              )}

              {method === "password" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.labelEmail")}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={t("auth.placeholderEmail")}
                      className="w-full px-4 py-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.labelPassword")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("auth.placeholderPassword")}
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
                    ? t("auth.btnSigningIn")
                    : t("auth.btnSending")
                  : method === "password"
                    ? t("auth.btnSignIn")
                    : t("auth.btnSendCode")}
              </button>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("auth.orAlso")}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3 rounded-lg bg-white text-gray-800 border border-gray-300 font-semibold text-sm hover:bg-gray-50 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.614z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.583-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                {t("auth.continueGoogle")}
              </button>

              {method === "password" && (
                <button
                  onClick={() => setSetupOpen(true)}
                  className="w-full mt-3 py-2 text-xs text-primary hover:underline transition-colors"
                >
                  {t("auth.firstTimePassword")}
                </button>
              )}

              <button
                onClick={() => navigate("/picks")}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {t("auth.continueWithoutAccount")}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4 text-center">
                {t("auth.otpPrompt")}{" "}
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
                {loading ? t("auth.verifying") : t("auth.verify")}
              </button>

              <button
                onClick={() => { setStep("input"); setOtp(""); }}
                className="w-full mt-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {method === "email" ? t("auth.changeEmail") : t("auth.changePhone")}
              </button>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t("auth.tagline")}
        </p>
      </div>

      <Dialog open={setupOpen} onOpenChange={setSetupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("auth.setupTitle")}</DialogTitle>
            <DialogDescription>
              {t("auth.setupDesc")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.labelEmail")}</label>
              <input
                type="email"
                value={setupEmail}
                onChange={(e) => setSetupEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.setupNewPassword")}</label>
              <input
                type="password"
                value={setupPassword}
                onChange={(e) => setSetupPassword(e.target.value)}
                placeholder={t("auth.placeholderPassword")}
                className="w-full px-4 py-2.5 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">{t("auth.setupSecret")}</label>
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
              {setupLoading ? t("auth.settingUp") : t("auth.setupSubmit")}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginPage;
