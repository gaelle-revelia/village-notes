import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  NotebookPen, Mic, PenLine, FileText, Pin, Activity,
  Timer, ChevronRight, ChevronLeft, X, MessageCircleQuestion,
} from "lucide-react";
import { icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";


const DOMAIN_CONFIG: Record<string, { color: string; icon: typeof Activity }> = {
  Moteur: { color: "#E8736A", icon: Activity },
  Cognitif: { color: "#8B74E0", icon: icons.Brain ?? Activity },
  Sensoriel: { color: "#44A882", icon: icons.Ear ?? Activity },
  "Bien-être": { color: "#E8A44A", icon: icons.Heart ?? Activity },
  Médical: { color: "#8A9BAE", icon: icons.Stethoscope ?? Activity },
};

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

interface Activite {
  id: string;
  nom: string;
  domaine: string;
  icone: string | null;
  track_temps: boolean | null;
  track_distance: boolean | null;
  unite_distance: string | null;
}

type View = "main" | "notes" | "activites" | "chrono-choice";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  enfantId: string | null;
}

export default function AddMemoSheet({ open, onOpenChange, enfantId }: Props) {
  const navigate = useNavigate();
  const [view, setView] = useState<View>("main");
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loadingActivites, setLoadingActivites] = useState(false);
  const [selectedActivite, setSelectedActivite] = useState<Activite | null>(null);

  // Reset view when dialog opens
  useEffect(() => {
    if (open) setView("main");
  }, [open]);

  // Fetch activities when view = activites
  useEffect(() => {
    if (view !== "activites" || !enfantId) return;
    setLoadingActivites(true);
    supabase
      .from("activites")
      .select("id, nom, domaine, icone, track_temps, track_distance, unite_distance")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivites((data as Activite[]) ?? []);
        setLoadingActivites(false);
      });
  }, [view, enfantId]);

  const go = (route: string) => {
    onOpenChange(false);
    navigate(route);
  };

  const domain = (d: string) => DOMAIN_CONFIG[d] ?? DOMAIN_CONFIG["Médical"];

  const translateX = view === "main" ? "0%" : view === "notes" ? "-25%" : view === "activites" ? "-50%" : "-75%";

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideClose
          className="w-[85vw] max-w-md rounded-2xl border-none shadow-xl p-0 gap-0 [&~[data-state]]:bg-black/40"
          style={{ overflow: "hidden" }}
        >
          <DialogHeader className="flex flex-row items-center justify-end px-4 pt-3 pb-0">
            <DialogTitle className="sr-only">Ajouter</DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 hover:bg-muted transition-colors text-muted-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>

          {/* Sliding container */}
          <div style={{ overflow: "hidden" }}>
            <div
              style={{
                display: "flex",
                width: "400%",
                transform: `translateX(${translateX})`,
                transition: "transform 0.3s ease",
              }}
            >
              {/* === Main panel === */}
              <nav className="w-full px-2 pb-4 pt-1" style={{ flex: "0 0 25%" }}>
                <MenuItem
                  icon={<NotebookPen className="h-5 w-5" />}
                  label="Note de rendez-vous"
                  onClick={() => setView("notes")}
                />
                <MenuItem
                  icon={<FileText className="h-5 w-5" />}
                  label="Document"
                  onClick={() => go("/nouveau-document")}
                />
                <MenuItem
                  icon={<Pin className="h-5 w-5" />}
                  label="Événement"
                  onClick={() => go("/nouvel-evenement")}
                />
                <MenuItem
                  icon={<Activity className="h-5 w-5" />}
                  label="Activité"
                  onClick={() => setView("activites")}
                />
              </nav>

              {/* === Notes sub-menu === */}
              <nav className="w-full px-2 pb-4 pt-1" style={{ flex: "0 0 25%" }}>
                <BackHeader label="Note de rendez-vous" onBack={() => setView("main")} />
                <MenuItem
                  icon={<Mic className="h-5 w-5" />}
                  label="Note vocale"
                  onClick={() => go("/nouveau-memo-vocal")}
                />
                <MenuItem
                  icon={<PenLine className="h-5 w-5" />}
                  label="Note écrite"
                  onClick={() => go("/nouvelle-note")}
                />
              </nav>

              {/* === Activites sub-menu === */}
              <div className="w-full px-2 pb-4 pt-1" style={{ flex: "0 0 25%" }}>
                <BackHeader label="Activité" onBack={() => setView("main")} />
                {loadingActivites ? (
                  <div className="flex items-center justify-center py-6">
                    <span className="text-sm text-muted-foreground">Chargement…</span>
                  </div>
                ) : activites.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
                    <p className="text-sm text-muted-foreground">Aucune activité</p>
                    <button
                      onClick={() => go("/outils/activites/creer")}
                      className="text-sm font-medium"
                      style={{ color: "#8B74E0" }}
                    >
                      Créer une activité
                    </button>
                  </div>
                ) : (
                  activites.map((a) => {
                    const d = domain(a.domaine);
                    const CustomIcon = a.icone ? icons[a.icone as keyof typeof icons] : null;
                    const Icon = CustomIcon ?? d.icon;
                    return (
                      <button
                        key={a.id}
                        onClick={() => {
                          setSelectedActivite(a);
                          setView("chrono-choice");
                        }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-muted transition-colors"
                      >
                        <div
                          className="flex items-center justify-center rounded-lg shrink-0"
                          style={{ width: 32, height: 32, background: `${d.color}20` }}
                        >
                          <Icon size={17} color={d.color} strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{a.nom}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: d.color }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: d.color }}>{a.domaine}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                      </button>
                    );
                  })
                )}
              </div>

              {/* === Chrono/Manuel choice === */}
              <div className="w-full px-2 pb-4 pt-1" style={{ flex: "0 0 25%" }}>
                <BackHeader label={selectedActivite?.nom || "Activité"} onBack={() => setView("activites")} />
                <div className="flex flex-col gap-3 mt-1">
                  <button
                    onClick={() => { navigate(`/outils/activites/${selectedActivite!.id}/chrono`); onOpenChange(false); setSelectedActivite(null); }}
                    className="flex items-center gap-3 rounded-2xl transition-transform active:scale-[0.97]"
                    style={{ ...glassCard, padding: "12px 14px" }}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}>
                      <Timer className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[14px] font-sans font-medium text-foreground">Lancer le chrono</span>
                      <span className="text-[11px] font-sans text-muted-foreground">Démarre un minuteur en temps réel</span>
                    </div>
                  </button>
                  <button
                    onClick={() => { navigate(`/outils/activites/${selectedActivite!.id}/manuel`); onOpenChange(false); setSelectedActivite(null); }}
                    className="flex items-center gap-3 rounded-2xl transition-transform active:scale-[0.97]"
                    style={{ ...glassCard, padding: "12px 14px" }}
                  >
                    <div className="flex items-center justify-center w-9 h-9 rounded-xl" style={{ background: "linear-gradient(135deg, #44A882, #5CA8D8)" }}>
                      <PenLine className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[14px] font-sans font-medium text-foreground">Ajouter manuellement</span>
                      <span className="text-[11px] font-sans text-muted-foreground">Saisir durée et distance après la séance</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function MenuItem({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-muted transition-colors"
    >
      <span className="text-muted-foreground">{icon}</span>
      <span className="flex-1 font-semibold text-foreground text-[15px]">{label}</span>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
    </button>
  );
}

function BackHeader({ label, onBack }: { label: string; onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left hover:bg-muted transition-colors mb-1"
    >
      <ChevronLeft className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-semibold text-foreground">{label}</span>
    </button>
  );
}
