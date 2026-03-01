import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Timer, PenLine, Activity, Brain, Hand, Heart, Stethoscope } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import BottomNavBar from "@/components/BottomNavBar";

const DOMAIN_CONFIG: Record<string, { color: string; icon: typeof Activity }> = {
  Moteur: { color: "#E8736A", icon: Activity },
  Cognitif: { color: "#8B74E0", icon: Brain },
  Sensoriel: { color: "#44A882", icon: Hand },
  "Bien-être": { color: "#E8A44A", icon: Heart },
  Médical: { color: "#8A9BAE", icon: Stethoscope },
};

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

interface Activite {
  id: string;
  nom: string;
  domaine: string;
  track_temps: boolean | null;
  track_distance: boolean | null;
  unite_distance: string | null;
}

export default function OutilsActivites() {
  const navigate = useNavigate();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Activite | null>(null);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("activites")
      .select("id, nom, domaine, track_temps, track_distance, unite_distance")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivites((data as Activite[]) ?? []);
        setLoading(false);
      });
  }, [enfantId]);

  const domain = (d: string) => DOMAIN_CONFIG[d] ?? DOMAIN_CONFIG["Médical"];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button onClick={() => navigate("/outils")} className="flex items-center gap-1 text-sm font-sans" style={{ color: "#8B74E0" }}>
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-serif font-semibold text-foreground">Activités</h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-28 flex flex-col gap-3">
        {(loading || enfantLoading) ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-sm font-sans text-muted-foreground">Chargement…</span>
          </div>
        ) : activites.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">🌱</span>
            <p className="text-[15px] font-sans text-muted-foreground max-w-[260px]">
              Aucune activité pour l'instant. Crée-en une pour commencer à suivre les progrès !
            </p>
          </div>
        ) : (
          activites.map((a) => {
            const d = domain(a.domaine);
            const Icon = d.icon;
            const units: string[] = [];
            if (a.track_temps) units.push("Temps");
            if (a.track_distance) units.push(a.unite_distance === "km" ? "Distance (km)" : "Distance (m)");
            return (
              <button
                key={a.id}
                onClick={() => setSelected(a)}
                className="flex items-center gap-3 p-4 text-left transition-transform active:scale-[0.98]"
                style={glassCard}
              >
                <div
                  className="flex items-center justify-center rounded-xl shrink-0"
                  style={{ width: 40, height: 40, background: `${d.color}20` }}
                >
                  <Icon size={20} color={d.color} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-sans font-medium text-foreground truncate">{a.nom}</p>
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span
                      className="text-[9px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                      style={{ background: `${d.color}18`, color: d.color }}
                    >
                      {a.domaine}
                    </span>
                    {units.map((u) => (
                      <span
                        key={u}
                        className="text-[9px] font-sans font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(138,155,174,0.12)", color: "#8A9BAE" }}
                      >
                        {u}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            );
          })
        )}

        {/* New activity button */}
        <button
          onClick={() => navigate("/outils/activites/creer")}
          className="flex items-center justify-center gap-2 py-3 mt-1 rounded-2xl border-2 border-dashed transition-transform active:scale-[0.97]"
          style={{ borderColor: "rgba(139,116,224,0.3)", color: "#8B74E0" }}
        >
          <Plus size={18} />
          <span className="text-[13px] font-sans font-medium">Nouvelle activité</span>
        </button>
      </main>

      {/* Drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="px-5 pt-2 pb-6 flex flex-col gap-3">
            <DrawerTitle className="text-base font-serif font-semibold text-foreground text-center">
              {selected?.nom}
            </DrawerTitle>
            <button
              onClick={() => { navigate(`/outils/activites/${selected!.id}/chrono`); setSelected(null); }}
              className="flex items-center gap-3 p-4 rounded-2xl transition-transform active:scale-[0.97]"
              style={glassCard}
            >
              <Timer size={20} color="#E8736A" />
              <span className="text-[14px] font-sans font-medium text-foreground">Lancer le chrono</span>
            </button>
            <button
              onClick={() => { navigate(`/outils/activites/${selected!.id}/manuel`); setSelected(null); }}
              className="flex items-center gap-3 p-4 rounded-2xl transition-transform active:scale-[0.97]"
              style={glassCard}
            >
              <PenLine size={20} color="#8B74E0" />
              <span className="text-[14px] font-sans font-medium text-foreground">Ajouter manuellement</span>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNavBar />
    </div>
  );
}
