import { useNavigate } from "react-router-dom";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  { q: '¿Cómo funciona?', a: 'Cada jornada de Liga MX, seleccionas si el equipo local gana (Local), empatan (Empate) o gana el visitante (Visitante). Ganas 1 punto por cada pronóstico correcto.' },
  { q: '¿Es gratis?', a: 'Sí, FC Quiniela es 100% gratuito. No aceptamos dinero ni apuestas de ningún tipo.' },
  { q: '¿Necesito descargar una app?', a: 'No. FC Quiniela funciona directamente en tu navegador. Solo abre el enlace y comienza a jugar.' },
  { q: '¿Puedo jugar desde México?', a: '¡Claro! FC Quiniela funciona en cualquier parte del mundo. Solo necesitas conexión a internet.' },
  { q: '¿Cómo se calculan los resultados?', a: 'Después de cada jornada, se comparan tus picks con los resultados reales de Liga MX. Ganas 1 punto por cada acierto. La tabla se actualiza automáticamente.' },
];

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="text-lg hover:opacity-70 text-foreground">←</button>
          <h1 className="font-bold text-lg text-foreground">Acerca de FC Quiniela</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Disclaimer */}
        <div className="bg-success/10 border-l-4 border-success rounded-r-xl p-4">
          <p className="text-sm font-bold leading-relaxed">
            FC Quiniela es un juego gratuito de predicciones. No aceptamos dinero. No somos una casa de apuestas.
          </p>
        </div>

        {/* What is it */}
        <section>
          <h2 className="font-bold mb-2">¿Qué es FC Quiniela?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            FC Quiniela es una plataforma gratuita donde puedes hacer tus pronósticos de Liga MX cada jornada, competir con tu familia y amigos en ligas privadas, y demostrar quién sabe más de fútbol mexicano. Todo en español, sin apuestas, y sin complicaciones.
          </p>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="font-bold mb-3">Preguntas frecuentes</h2>
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
          FC Quiniela © 2026
        </footer>
      </main>
    </div>
  );
};

export default AboutPage;
