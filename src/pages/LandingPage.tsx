import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

const LandingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-navy text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 text-8xl">⚽</div>
          <div className="absolute bottom-20 right-10 text-6xl">🏆</div>
          <div className="absolute top-1/2 left-1/2 text-9xl -translate-x-1/2 -translate-y-1/2 opacity-5">⚽</div>
        </div>

        <div className="relative max-w-lg mx-auto px-6 pt-16 pb-20 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-4">
              Tu quiniela de Liga MX
            </h1>
            <p className="text-xl sm:text-2xl font-light text-amber mb-2">
              gratis, en familia, sin apuestas
            </p>
            <p className="text-sm text-white/60 mb-8 max-w-xs mx-auto">
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
              onClick={() => navigate(user ? '/picks' : '/auth')}
              className="bg-amber text-navy font-bold py-3.5 px-8 rounded-lg text-lg shadow-lg hover:brightness-110 active:scale-95 transition-all"
            >
              {user ? 'Hacer mis picks' : 'Comenzar'}
            </button>
            <button
              onClick={() => navigate('/league/create')}
              className="border-2 border-white/40 text-primary-foreground font-semibold py-3.5 px-8 rounded-lg text-lg hover:bg-white/10 active:scale-95 transition-all"
            >
              Crear una quiniela
            </button>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-lg mx-auto px-6 py-14">
        <h2 className="text-xl font-bold text-center mb-8">¿Cómo funciona?</h2>
        <div className="space-y-6">
          {[
            { step: '1', emoji: '⚽', title: 'Haz tus picks', desc: 'Elige Local, Empate o Visitante para cada partido de la jornada.' },
            { step: '2', emoji: '🏆', title: 'Compite con tu gente', desc: 'Crea una liga privada y comparte el enlace por WhatsApp.' },
            { step: '3', emoji: '📊', title: 'Revisa los resultados', desc: 'Gana puntos por cada pronóstico correcto y sube en la tabla.' },
          ].map(item => (
            <motion.div
              key={item.step}
              className="flex items-start gap-4"
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Number(item.step) * 0.1 }}
            >
              <div className="w-12 h-12 rounded-full bg-electric-blue/10 flex items-center justify-center text-2xl shrink-0">
                {item.emoji}
              </div>
              <div>
                <h3 className="font-bold text-sm mb-0.5">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust section */}
      <section className="bg-card border-y border-border">
        <div className="max-w-lg mx-auto px-6 py-10 text-center">
          <div className="flex flex-wrap justify-center gap-4 text-sm font-medium">
            <span className="flex items-center gap-1.5">✅ Juego gratuito</span>
            <span className="flex items-center gap-1.5">✅ Sin apuestas</span>
            <span className="flex items-center gap-1.5">✅ Sin registro obligatorio</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-lg mx-auto px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          FC Quiniela © 2026 · <button onClick={() => navigate('/about')} className="underline hover:text-foreground">Acerca de</button>
        </p>
      </footer>
    </div>
  );
};

export default LandingPage;
