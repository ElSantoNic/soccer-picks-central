import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 pt-24 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight tracking-tight text-foreground mb-4">
              Tu quiniela de{" "}
              <span className="text-primary">Liga MX</span>
              {" "}gratis y en familia
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-md mx-auto mb-10">
              Haz tus pronósticos cada jornada, compite con tu familia y amigos, y demuestra quién sabe más de fútbol.
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
              {user ? "Hacer mis picks" : "Comenzar"}
            </button>
            <button
              onClick={() => navigate("/league/create")}
              className="border border-border text-foreground font-semibold py-3.5 px-8 rounded-lg text-base hover:bg-muted active:scale-[0.98] transition-all"
            >
              Crear una quiniela
            </button>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-2xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10 text-foreground">
          ¿Cómo funciona?
        </h2>
        <div className="space-y-6">
          {[
            { step: "1", emoji: "⚽", title: "Haz tus picks", desc: "Elige Local, Empate o Visitante para cada partido de la jornada." },
            { step: "2", emoji: "🏆", title: "Compite con tu gente", desc: "Crea una liga privada y comparte el enlace por WhatsApp." },
            { step: "3", emoji: "📊", title: "Revisa los resultados", desc: "Gana puntos por cada pronóstico correcto y sube en la tabla." },
          ].map((item) => (
            <motion.div
              key={item.step}
              className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Number(item.step) * 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                {item.emoji}
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-0.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="border-y border-border">
        <div className="max-w-2xl mx-auto px-6 py-10 text-center">
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-muted-foreground">
            <span className="flex items-center gap-1.5">✅ Juego gratuito</span>
            <span className="flex items-center gap-1.5">✅ Sin apuestas</span>
            <span className="flex items-center gap-1.5">✅ Sin registro obligatorio</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-2xl mx-auto px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          FC Quiniela © 2026 ·{" "}
          <button onClick={() => navigate("/about")} className="underline hover:text-foreground">
            Acerca de
          </button>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
