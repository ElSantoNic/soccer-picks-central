import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Volleyball, Trophy, ClipboardList, CheckCircle2, type LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const steps: { step: string; Icon: LucideIcon; title: string; desc: string }[] = [
    { step: "1", Icon: Volleyball, title: t("landing.step1Title"), desc: t("landing.step1Desc") },
    { step: "2", Icon: Trophy, title: t("landing.step2Title"), desc: t("landing.step2Desc") },
    { step: "3", Icon: ClipboardList, title: t("landing.step3Title"), desc: t("landing.step3Desc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <section className="relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground mb-4">
              {t("landing.heroTitle1")}{" "}
              <span className="text-primary">{t("landing.heroTitleHighlight")}</span>
              {" "}{t("landing.heroTitle2")}
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-md mx-auto mb-10">
              {t("landing.heroSubtitle")}
            </p>
          </motion.div>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <button
              onClick={() => navigate(user ? "/picks" : "/auth")}
              className="bg-primary text-primary-foreground font-semibold py-3.5 px-8 rounded-lg text-base hover:brightness-110 active:scale-[0.98] transition-all"
            >
              {user ? t("landing.ctaMakePicks") : t("landing.ctaStart")}
            </button>
            <button
              onClick={() => navigate("/league/create")}
              className="border border-border text-foreground font-semibold py-3.5 px-8 rounded-lg text-base hover:bg-muted active:scale-[0.98] transition-all"
            >
              {t("landing.ctaCreateLeague")}
            </button>
          </motion.div>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10 text-foreground">
          {t("landing.howItWorks")}
        </h2>
        <div className="space-y-6">
          {steps.map((item) => {
            const Icon = item.Icon;
            return (
              <motion.div
                key={item.step}
                className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border"
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: Number(item.step) * 0.1 }}
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Icon className="text-primary" size={26} strokeWidth={2.25} />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-0.5">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      <section className="border-y border-border">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} strokeWidth={2.25} className="text-primary" /> {t("landing.trustFree")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} strokeWidth={2.25} className="text-primary" /> {t("landing.trustNoBetting")}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={16} strokeWidth={2.25} className="text-primary" /> {t("landing.trustNoSignup")}</span>
          </div>
        </div>
      </section>

      <footer className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          {t("landing.footer")} ·{" "}
          <button onClick={() => navigate("/about")} className="underline hover:text-foreground">
            {t("landing.about")}
          </button>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
