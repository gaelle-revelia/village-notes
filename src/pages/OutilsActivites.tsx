import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Activity, Brain, Stethoscope, Heart, Ear, MoreVertical, Loader2, Info, ChevronRight } from "lucide-react";
import { icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import BottomNavBar from "@/components/BottomNavBar";

const DOMAINS = [
  { label: "Moteur", color: "#E8736A" },
  { label: "Cognitif", color: "#8B74E0" },
  { label: "Sensoriel", color: "#44A882" },
  { label: "Bien-être", color: "#E8A44A" },
  { label: "Médical", color: "#8A9BAE" },
];

const ICON_NAMES = [
  "Footprints","Bike","Baby","Heart","Brain","Ear","Eye","Hand","Stethoscope","Activity",
  "Dumbbell","Wind","Music","Smile","Sun","Star","Flower2","Leaf","Waves","Circle",
  "ArrowUp","MoveHorizontal","StretchHorizontal","PersonStanding","Accessibility",
  "Gamepad2","Puzzle","BookOpen","Paintbrush","Scissors","Timer","Zap","Sparkles",
] as const;

const DOMAIN_CONFIG: Record<string, { color: string; icon: typeof Activity }> = {
  Moteur: { color: "#E8736A", icon: Activity },
  Cognitif: { color: "#8B74E0", icon: Brain },
  Sensoriel: { color: "#44A882", icon: Ear },
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

const glassHeader: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
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

function RenderIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const IconComp = icons[name as keyof typeof icons];
  if (!IconComp) return null;
  return <IconComp size={size} color={color} />;
}

export default function OutilsActivites() {
  const navigate = useNavigate();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();
  const [activites, setActivites] = useState<Activite[]>([]);
  const [loading, setLoading] = useState(true);

  // Inline editing
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftNoms, setDraftNoms] = useState<Record<string, string>>({});
  const [suggestingIcon, setSuggestingIcon] = useState(false);

  // Archive state
  const [archiving, setArchiving] = useState<Activite | null>(null);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("activites")
      .select("id, nom, domaine, icone, track_temps, track_distance, unite_distance")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setActivites((data as Activite[]) ?? []);
        setLoading(false);
      });
  }, [enfantId]);

  const handleExpand = (a: Activite) => {
    if (expandedId === a.id) {
      setExpandedId(null);
    } else {
      setExpandedId(a.id);
      setDraftNoms((prev) => ({ ...prev, [a.id]: a.nom }));
    }
  };

  const saveNom = async (a: Activite) => {
    const newNom = (draftNoms[a.id] ?? a.nom).trim();
    if (!newNom) {
      setDraftNoms((prev) => ({ ...prev, [a.id]: a.nom }));
      return;
    }
    if (newNom === a.nom) return;
    const { error } = await supabase.from("activites").update({ nom: newNom }).eq("id", a.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le nom.", variant: "destructive" });
      return;
    }
    setActivites((prev) => prev.map((x) => x.id === a.id ? { ...x, nom: newNom } : x));
    // Suggest icon silently
    try {
      setSuggestingIcon(true);
      const { data } = await supabase.functions.invoke("suggest-icon", { body: { nom: newNom, domaine: a.domaine } });
      if (data?.icon) {
        await supabase.from("activites").update({ icone: data.icon }).eq("id", a.id);
        setActivites((prev) => prev.map((x) => x.id === a.id ? { ...x, icone: data.icon } : x));
      }
    } catch {} finally { setSuggestingIcon(false); }
  };

  const saveDomaine = async (a: Activite, newDomaine: string) => {
    if (newDomaine === a.domaine) return;
    const { error } = await supabase.from("activites").update({ domaine: newDomaine }).eq("id", a.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier le domaine.", variant: "destructive" });
      return;
    }
    setActivites((prev) => prev.map((x) => x.id === a.id ? { ...x, domaine: newDomaine } : x));
  };

  const handleArchive = async () => {
    if (!archiving) return;
    const { error } = await supabase.from("activites").update({ actif: false }).eq("id", archiving.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible d'archiver l'activité.", variant: "destructive" });
    } else {
      setActivites((prev) => prev.filter((a) => a.id !== archiving.id));
      toast({ title: "Activité archivée" });
    }
    setArchiving(null);
  };

  const domain = (d: string) => DOMAIN_CONFIG[d] ?? DOMAIN_CONFIG["Médical"];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button onClick={() => navigate("/outils")} className="flex items-center gap-1 text-sm font-sans" style={{ color: "#8B74E0" }}>
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-serif font-semibold text-foreground">Activités</h1>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-28 flex flex-col gap-3">
        {/* Help trigger */}
        {!(loading || enfantLoading) && (
          <button onClick={() => setShowHelp(true)} className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0">
            <Info size={14} color="#8B74E0" />
            <span style={{ fontSize: 11, color: "#9A9490", fontFamily: "'DM Sans', sans-serif" }}>
              Comment utiliser les Activités ?
            </span>
          </button>
        )}

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
            const CustomIcon = a.icone ? icons[a.icone as keyof typeof icons] : null;
            const Icon = CustomIcon ?? d.icon;
            const units: string[] = [];
            if (a.track_temps) units.push("Temps");
            if (a.track_distance) units.push(a.unite_distance === "km" ? "Distance en km" : "Distance en mètres");
            const isExpanded = expandedId === a.id;
            return (
              <div
                key={a.id}
                className="transition-all"
                style={{ ...glassCard, padding: "11px 13px" }}
              >
                <div
                  className="flex items-center gap-3 cursor-pointer transition-transform active:scale-[0.98]"
                  onClick={() => handleExpand(a)}
                >
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 40, height: 40, background: `${d.color}20` }}
                  >
                    {suggestingIcon && isExpanded ? (
                      <Loader2 size={20} className="animate-spin" color={d.color} />
                    ) : (
                      <Icon size={20} color={d.color} strokeWidth={2} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate" style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A" }}>{a.nom}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <div className="flex items-center" style={{ gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: d.color }} />
                        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: d.color }}>
                          {a.domaine}
                        </span>
                      </div>
                      {units.length > 0 && (
                        <>
                          <div style={{ width: 1, height: 11, backgroundColor: "rgba(0,0,0,0.1)" }} />
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 400, color: "#9A9490" }}>
                            {units.join(" · ")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-muted-foreground shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="shrink-0 flex items-center justify-center rounded-lg"
                        style={{ width: 32, height: 32 }}
                      >
                        <MoreVertical size={18} color="#9A9490" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-[140px]">
                      <DropdownMenuItem onClick={() => setArchiving(a)} className="text-[13px] font-sans" style={{ color: "#E8736A" }}>
                        Archiver
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {isExpanded && (
                  <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
                    {/* Nom */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5 uppercase" style={{ fontFamily: "DM Sans" }}>NOM</p>
                      <input
                        autoFocus
                        className="w-full text-sm text-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5"
                        style={{ fontFamily: "DM Sans" }}
                        value={draftNoms[a.id] ?? a.nom}
                        onChange={(e) => setDraftNoms((prev) => ({ ...prev, [a.id]: e.target.value }))}
                        onBlur={() => saveNom(a)}
                        onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                      />
                    </div>

                    {/* Domaine */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-1.5 uppercase" style={{ fontFamily: "DM Sans" }}>DOMAINE</p>
                      <div className="flex items-center justify-between" style={{ gap: 8 }}>
                        {DOMAINS.map((dd) => (
                          <button key={dd.label} onClick={() => saveDomaine(a, dd.label)} className="flex flex-col items-center gap-1">
                            <div className="rounded-full transition-all" style={{
                              width: 24, height: 24,
                              background: a.domaine === dd.label ? dd.color : "transparent",
                              border: `2.5px solid ${dd.color}`,
                              opacity: a.domaine === dd.label ? 1 : 0.35,
                              boxShadow: a.domaine === dd.label ? `0 0 0 4px ${dd.color}38` : "none",
                            }} />
                            <span className="text-[10px] font-sans font-medium" style={{ color: a.domaine === dd.label ? dd.color : "#9A9490" }}>{dd.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Icône (display only) */}
                    <div>
                      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5 uppercase" style={{ fontFamily: "DM Sans" }}>ICÔNE</p>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center justify-center rounded-xl" style={{ width: 32, height: 32, background: `${d.color}18` }}>
                          <RenderIcon name={a.icone ?? "Activity"} size={18} color={d.color} />
                        </div>
                        <span className="text-xs text-muted-foreground italic" style={{ fontFamily: "DM Sans" }}>
                          Mise à jour automatique
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
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

      {/* Archive confirmation */}
      <AlertDialog open={!!archiving} onOpenChange={(o) => !o && setArchiving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-serif">Archiver « {archiving?.nom} » ?</AlertDialogTitle>
            <AlertDialogDescription className="font-sans text-[13px]">
              L'activité ne sera plus visible dans la liste, mais l'historique des séances est conservé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-sans text-[13px]">Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="font-sans text-[13px]" style={{ background: "#E8736A" }}>
              Archiver
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent hideClose className="max-w-[340px]" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderRadius: 20, padding: "24px 20px" }}>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A", marginBottom: 12 }}>
            Vos activités suivies
          </h3>
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "16px 0" }} />
          <div className="flex flex-col gap-3">
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#4A4440", lineHeight: 1.65 }}>
              <span style={{ color: "#8B74E0" }}>✦</span> Pour beaucoup d'enfants avec des besoins spécifiques, la répétition est clé. Ce sont des petites actions répétées, une résilience qui se construit dans le temps.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#4A4440", lineHeight: 1.65 }}>
              <span style={{ color: "#8B74E0" }}>✦</span> Créez les activités qui comptent pour votre enfant, dans vos mots, à son rythme. Chaque session d'activité laisse une trace dans la timeline.
            </p>
            <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#4A4440", lineHeight: 1.65 }}>
              <span style={{ color: "#8B74E0" }}>✦</span> Vous pouvez lancer une activité directement depuis la timeline, en appuyant sur le bouton +.
            </p>
          </div>
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "16px 0" }} />
          <button
            onClick={() => setShowHelp(false)}
            className="w-full py-3 rounded-xl text-[14px] font-sans font-semibold transition-transform active:scale-[0.97]"
            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.72)", color: "#1E1A1A" }}
          >
            Compris
          </button>
        </DialogContent>
      </Dialog>

      <BottomNavBar />
    </div>
  );
}
