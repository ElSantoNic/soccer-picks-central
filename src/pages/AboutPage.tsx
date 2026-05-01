import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const AboutPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const faqs = t("about.faqs", { returnObjects: true }) as { q: string; a: string }[];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-lg hover:opacity-70 text-foreground">←</button>
          <h1 className="font-bold text-lg text-foreground">{t("about.title")}</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <div className="bg-success/10 border-l-4 border-success rounded-r-xl p-4">
          <p className="text-sm font-bold leading-relaxed">
            {t("about.disclaimer")}
          </p>
        </div>

        <section>
          <h2 className="font-bold mb-2">{t("about.whatTitle")}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t("about.whatDesc")}
          </p>
        </section>

        <section>
          <h2 className="font-bold mb-3">{t("about.faqTitle")}</h2>
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="bg-card rounded-lg border border-border px-4">
                <AccordionTrigger className="text-sm font-semibold text-left py-3 hover:no-underline">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-3">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        <footer className="text-center text-xs text-muted-foreground pt-4">
          {t("about.footer")}
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
