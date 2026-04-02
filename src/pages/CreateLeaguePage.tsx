import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const CreateLeaguePage = () => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [joinCode, setJoinCode] = useState(
    String(Math.floor(1000 + Math.random() * 9000))
  );
  const [showShare, setShowShare] = useState(false);
  const [createdLeagueId, setCreatedLeagueId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Ingresa un nombre para tu quiniela');
      return;
    }
    if (joinCode.length !== 4) {
      toast.error('El código debe tener 4 dígitos');
      return;
    }

    setSaving(true);
    const { data, error } = await supabase
      .from('leagues')
      .insert({ name: name.trim(), description: description.trim() || null, join_code: joinCode })
      .select('id')
      .single();

    setSaving(false);

    if (error) {
      if (error.code === '23505') {
        toast.error('Ese código ya está en uso. Prueba otro.');
      } else {
        toast.error('Error al crear la quiniela');
      }
      return;
    }

    setCreatedLeagueId(data.id);
    setShowShare(true);
  };

  const inviteUrl = `fcquiniela.app/l/${joinCode}`;
  const inviteMsg = `¡Únete a mi quiniela "${name}" en FC Quiniela! Haz tus picks aquí: ${inviteUrl}`;

  if (showShare) {
    return (
      <div className="min-h-screen pb-20">
        <TopBar />
        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="bg-card rounded-xl p-6 shadow-sm text-center">
            <h2 className="text-xl font-bold mb-1">🎉 ¡Quiniela creada!</h2>
            <p className="text-sm text-muted-foreground mb-6">Comparte tu quiniela con familia y amigos</p>

            <div className="bg-soft-gray rounded-lg p-3 mb-6 text-sm font-mono break-all">
              {inviteUrl}
            </div>

            <div className="space-y-3 mb-6">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(inviteMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-[#25D366] text-primary-foreground font-semibold hover:brightness-110 transition-all"
              >
                💬 Compartir por WhatsApp
              </a>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(inviteUrl);
                  toast.success('¡Enlace copiado!');
                }}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-soft-gray font-semibold hover:bg-muted transition-all"
              >
                📋 Copiar enlace
              </button>
            </div>

            <div className="border-t border-border pt-4">
              <p className="text-xs text-muted-foreground mb-1">Código de acceso</p>
              <p className="text-2xl font-mono font-bold tracking-widest">{joinCode}</p>
            </div>

            <button
              onClick={() => navigate(`/league/${createdLeagueId}`)}
              className="mt-6 text-sm text-electric-blue font-semibold hover:underline"
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
    <div className="min-h-screen pb-20">
      <TopBar />
      <main className="max-w-lg mx-auto px-4 py-6">
        <h2 className="text-xl font-bold mb-6">Crear quiniela</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold mb-1.5 block">Nombre de tu quiniela *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Quiniela Familia García"
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-sm font-semibold mb-1.5 block">Descripción (opcional)</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
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
              onChange={e => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4))}
              maxLength={4}
              className="w-full px-4 py-3 rounded-lg border border-input bg-card text-sm font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="w-full py-3.5 rounded-lg bg-amber text-navy font-bold text-lg shadow-md hover:brightness-110 active:scale-[0.98] transition-all mt-2 disabled:opacity-50"
          >
            {saving ? 'Creando...' : 'Crear quiniela'}
          </button>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default CreateLeaguePage;
