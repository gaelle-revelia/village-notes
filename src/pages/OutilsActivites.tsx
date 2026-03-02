import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Timer, PenLine, Activity, Brain, Stethoscope, Heart, Ear, MoreVertical, Loader2 } from "lucide-react";
import { icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  const [selected, setSelected] = useState<Activite | null>(null);

  // Edit state
  const [editing, setEditing] = useState<Activite | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editDomaine, setEditDomaine] = useState("Moteur");
  const [editIcone, setEditIcone] = useState("Activity");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [suggestingIcon, setSuggestingIcon] = useState(false);

  // Archive state
  const [archiving, setArchiving] = useState<Activite | null>(null);

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

  const openEdit = (a: Activite) => {
    setEditNom(a.nom);
    setEditDomaine(a.domaine);
    setEditIcone(a.icone ?? "Activity");
    setShowIconPicker(false);
    setEditing(a);
  };

  const suggestIcon = async () => {
    if (!editNom.trim()) return;
    setSuggestingIcon(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-icon", { body: { nom: editNom.trim(), domaine: editDomaine } });
      if (!error && data?.icon) setEditIcone(data.icon);
    } catch {} finally { setSuggestingIcon(false); }
  };

  const handleSaveEdit = async () => {
    if (!editing || !editNom.trim()) return;
    setSavingEdit(true);
    const { error } = await supabase.from("activites").update({ nom: editNom.trim(), domaine: editDomaine, icone: editIcone }).eq("id", editing.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de modifier l'activité.", variant: "destructive" });
    } else {
      setActivites((prev) => prev.map((a) => a.id === editing.id ? { ...a, nom: editNom.trim(), domaine: editDomaine, icone: editIcone } : a));
      toast({ title: "Activité modifiée" });
    }
    setSavingEdit(false);
    setEditing(null);
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

  const editDomainColor = DOMAINS.find((d) => d.label === editDomaine)?.color ?? "#8A9BAE";
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
            return (
              <div
                key={a.id}
                className="flex items-center gap-3 text-left transition-transform active:scale-[0.98]"
                style={{ ...glassCard, padding: "11px 13px" }}
              >
                <button
                  onClick={() => setSelected(a)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div
                    className="flex items-center justify-center rounded-xl shrink-0"
                    style={{ width: 40, height: 40, background: `${d.color}20` }}
                  >
                    <Icon size={20} color={d.color} strokeWidth={2} />
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
                </button>
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
                    <DropdownMenuItem onClick={() => openEdit(a)} className="text-[13px] font-sans">
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setArchiving(a)} className="text-[13px] font-sans" style={{ color: "#E8736A" }}>
                      Archiver
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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

      {/* Drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent>
          <div className="pt-2 pb-6 flex flex-col gap-3" style={{ maxWidth: 400, margin: "0 auto", padding: "8px 20px 24px" }}>
            <DrawerTitle className="text-base font-serif font-semibold text-foreground text-center">
              {selected?.nom}
            </DrawerTitle>
            <button
              onClick={() => { navigate(`/outils/activites/${selected!.id}/chrono`); setSelected(null); }}
              className="flex items-center gap-3 rounded-2xl transition-transform active:scale-[0.97]"
              style={{ ...glassCard, padding: "12px 14px" }}
            >
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: "rgba(232,115,106,0.15)" }}>
                <Timer size={20} color="#E8736A" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[14px] font-sans font-medium text-foreground">Lancer le chrono</span>
                <span className="text-[11px] font-sans text-muted-foreground">Démarre un minuteur en temps réel</span>
              </div>
            </button>
            <button
              onClick={() => { navigate(`/outils/activites/${selected!.id}/manuel`); setSelected(null); }}
              className="flex items-center gap-3 rounded-2xl transition-transform active:scale-[0.97]"
              style={{ ...glassCard, padding: "12px 14px" }}
            >
              <div className="flex items-center justify-center rounded-xl shrink-0" style={{ width: 40, height: 40, background: "rgba(139,116,224,0.15)" }}>
                <PenLine size={20} color="#8B74E0" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[14px] font-sans font-medium text-foreground">Ajouter manuellement</span>
                <span className="text-[11px] font-sans text-muted-foreground">Saisir durée et distance après la séance</span>
              </div>
            </button>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Edit Drawer */}
      <Drawer open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DrawerContent>
          <div className="pt-2 pb-6 flex flex-col gap-3" style={{ maxWidth: 400, margin: "0 auto", padding: "8px 20px 24px" }}>
            <DrawerTitle className="text-base font-serif font-semibold text-foreground text-center">
              Modifier l'activité
            </DrawerTitle>

            {/* Nom */}
            <div style={{ ...glassCard, padding: "12px 14px" }} className="flex flex-col gap-1.5">
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
                Nom
              </label>
              <input
                value={editNom}
                onChange={(e) => setEditNom(e.target.value)}
                onBlur={suggestIcon}
                className="bg-transparent border-none outline-none text-[15px] font-sans text-foreground placeholder:text-muted-foreground"
                style={{ padding: "6px 0" }}
              />
            </div>

            {/* Icône */}
            <div style={{ ...glassCard, padding: "12px 14px" }} className="flex flex-col gap-2">
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
                Icône
              </label>
              {suggestingIcon ? (
                <div className="flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin" style={{ color: "#9A9490" }} />
                  <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>Suggestion…</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center rounded-xl" style={{ width: 40, height: 40, background: editDomainColor + "18" }}>
                    <RenderIcon name={editIcone} size={22} color={editDomainColor} />
                  </div>
                  <span className="text-[13px] font-sans font-medium text-foreground flex-1">{editIcone}</span>
                  <button type="button" onClick={() => setShowIconPicker(!showIconPicker)} className="text-[13px] font-sans font-semibold" style={{ color: "#8B74E0" }}>
                    {showIconPicker ? "Fermer" : "Changer"}
                  </button>
                </div>
              )}
              {showIconPicker && (
                <div className="grid grid-cols-6 gap-2 pt-2">
                  {ICON_NAMES.map((name) => {
                    const isActive = editIcone === name;
                    return (
                      <button key={name} type="button" onClick={() => { setEditIcone(name); setShowIconPicker(false); }}
                        className="flex items-center justify-center rounded-xl transition-all"
                        style={{ width: 40, height: 40, background: isActive ? editDomainColor + "18" : "rgba(255,255,255,0.5)", border: isActive ? `2px solid ${editDomainColor}` : "1px solid rgba(255,255,255,0.85)" }}
                      >
                        <RenderIcon name={name} size={20} color={isActive ? editDomainColor : "#9A9490"} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Domaine */}
            <div style={{ ...glassCard, padding: "12px 14px" }} className="flex flex-col gap-2.5">
              <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
                Domaine
              </label>
              <div className="flex items-center justify-between" style={{ gap: 12 }}>
                {DOMAINS.map((dd) => (
                  <button key={dd.label} onClick={() => setEditDomaine(dd.label)} className="flex flex-col items-center gap-1">
                    <div className="rounded-full transition-all" style={{ width: 28, height: 28, background: editDomaine === dd.label ? dd.color : "transparent", border: `2.5px solid ${dd.color}`, opacity: editDomaine === dd.label ? 1 : 0.35, boxShadow: editDomaine === dd.label ? `0 0 0 5px ${dd.color}38` : "none" }} />
                    <span className="text-[11px] font-sans font-medium" style={{ color: editDomaine === dd.label ? dd.color : "#9A9490" }}>{dd.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Save */}
            <button
              disabled={!editNom.trim() || savingEdit}
              onClick={handleSaveEdit}
              className="w-full py-3 rounded-2xl text-[14px] font-sans font-semibold text-white transition-opacity disabled:opacity-40 mt-1"
              style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
            >
              {savingEdit ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </DrawerContent>
      </Drawer>

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

      <BottomNavBar />
    </div>
  );
}
