import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { icons } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";

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

type TrackMode = "temps" | "distance" | "les_deux";

function RenderIcon({ name, size = 20, color }: { name: string; size?: number; color?: string }) {
  const IconComp = icons[name as keyof typeof icons];
  if (!IconComp) return null;
  return <IconComp size={size} color={color} />;
}

export default function OutilsActiviteCreer() {
  const navigate = useNavigate();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();

  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("Moteur");
  const [trackMode, setTrackMode] = useState<TrackMode>("temps");
  const [unite, setUnite] = useState<"metres" | "km">("metres");
  const [saving, setSaving] = useState(false);

  const [icone, setIcone] = useState("Activity");
  const [suggestingIcon, setSuggestingIcon] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  const showDistance = trackMode === "distance" || trackMode === "les_deux";
  const canSave = nom.trim().length > 0 && enfantId && !saving;
  const domainColor = DOMAINS.find((d) => d.label === domaine)?.color ?? "#8A9BAE";

  const suggestIcon = async () => {
    if (!nom.trim()) return;
    setSuggestingIcon(true);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-icon", {
        body: { nom: nom.trim(), domaine },
      });
      if (!error && data?.icon) {
        setIcone(data.icon);
      }
    } catch {
      // silently fallback
    } finally {
      setSuggestingIcon(false);
    }
  };

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from("activites").insert({
      enfant_id: enfantId!,
      nom: nom.trim(),
      domaine,
      icone,
      track_temps: trackMode === "temps" || trackMode === "les_deux",
      track_distance: trackMode === "distance" || trackMode === "les_deux",
      unite_distance: showDistance ? unite : "metres",
    });
    if (error) {
      toast({ title: "Erreur", description: "Impossible de créer l'activité.", variant: "destructive" });
      setSaving(false);
    } else {
      navigate("/outils/activites", { replace: true });
    }
  };

  const TRACK_OPTIONS: { value: TrackMode; label: string }[] = [
    { value: "temps", label: "Temps" },
    { value: "distance", label: "Distance" },
    { value: "les_deux", label: "Les deux" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button onClick={() => navigate("/outils/activites")} className="flex items-center gap-1 text-sm font-sans" style={{ color: "#8B74E0" }}>
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-serif font-semibold text-foreground">Nouvelle activité</h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-32 flex flex-col gap-3" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        {/* Nom + icon preview */}
        <div style={{ ...glassCard, padding: "14px 16px" }} className="flex flex-col gap-1.5">
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
            Nom de l'activité
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            onBlur={suggestIcon}
            placeholder="Ex : Marche, Vélo, Natation…"
            className="bg-transparent border-none outline-none text-[15px] font-sans text-foreground placeholder:text-muted-foreground"
            style={{ padding: "10px 12px" }}
          />

          {/* Icon preview */}
          {suggestingIcon ? (
            <div className="flex items-center gap-2 pt-1 px-1">
              <Loader2 size={16} className="animate-spin" style={{ color: "#9A9490" }} />
              <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>Suggestion d'icône…</span>
            </div>
          ) : nom.trim() ? (
            <div className="flex items-center gap-3 pt-2 px-1">
              <div
                className="flex items-center justify-center rounded-xl"
                style={{ width: 40, height: 40, background: domainColor + "18" }}
              >
                <RenderIcon name={icone} size={22} color={domainColor} />
              </div>
              <span className="text-[13px] font-sans font-medium text-foreground flex-1">{icone}</span>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setShowIconPicker(true); }}
                className="text-[13px] font-sans font-semibold"
                style={{ color: "#8B74E0", background: "none", border: "none" }}
              >
                Changer
              </button>
            </div>
          ) : null}
        </div>

        {/* Icon picker grid */}
        {showIconPicker && (
          <div style={{ ...glassCard, padding: "14px 16px" }} className="flex flex-col gap-2.5">
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
              Choisir une icône
            </label>
            <div className="grid grid-cols-6 gap-2">
              {ICON_NAMES.map((name) => {
                const isActive = icone === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => { setIcone(name); setShowIconPicker(false); }}
                    className="flex items-center justify-center rounded-xl transition-all"
                    style={{
                      width: 40, height: 40,
                      background: isActive ? domainColor + "18" : "rgba(255,255,255,0.5)",
                      border: isActive ? `2px solid ${domainColor}` : "1px solid rgba(255,255,255,0.85)",
                      boxShadow: isActive ? `0 0 0 4px ${domainColor}38` : "none",
                    }}
                  >
                    <RenderIcon name={name} size={20} color={isActive ? domainColor : "#9A9490"} />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Domaine */}
        <div style={{ ...glassCard, padding: "14px 16px" }} className="flex flex-col gap-2.5">
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
            Domaine
          </label>
          <div className="flex items-center justify-between" style={{ gap: 12 }}>
            {DOMAINS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDomaine(d.label)}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: 28, height: 28,
                    background: domaine === d.label ? d.color : "transparent",
                    border: `2.5px solid ${d.color}`,
                    opacity: domaine === d.label ? 1 : 0.35,
                    boxShadow: domaine === d.label ? `0 0 0 5px ${d.color}38` : "none",
                  }}
                />
                <span className="text-[11px] font-sans font-medium" style={{ color: domaine === d.label ? d.color : "#9A9490" }}>
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Track mode */}
        <div style={{ ...glassCard, padding: "14px 16px" }} className="flex flex-col gap-2.5">
          <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
            Ce que tu suis
          </label>
          <div className="flex gap-2">
            {TRACK_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTrackMode(o.value)}
                className="flex-1 rounded-xl text-[13px] font-sans font-medium transition-all"
                style={{
                  padding: "10px 12px",
                  background: trackMode === o.value ? "linear-gradient(135deg, #E8736A, #8B74E0)" : "rgba(255,255,255,0.5)",
                  color: trackMode === o.value ? "#fff" : "#9A9490",
                  border: trackMode === o.value ? "none" : "1px solid rgba(255,255,255,0.85)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Unit toggle */}
        {showDistance && (
          <div style={{ ...glassCard, padding: "14px 16px" }} className="flex flex-col gap-2.5">
            <label style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#9A9490" }}>
              Unité de distance
            </label>
            <div className="flex gap-2">
              {([["metres", "Mètres"], ["km", "Kilomètres"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setUnite(val)}
                  className="flex-1 rounded-xl text-[13px] font-sans font-medium transition-all"
                  style={{
                    padding: "10px 12px",
                    background: unite === val ? "linear-gradient(135deg, #E8736A, #8B74E0)" : "rgba(255,255,255,0.5)",
                    color: unite === val ? "#fff" : "#9A9490",
                    border: unite === val ? "none" : "1px solid rgba(255,255,255,0.85)",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <button
          disabled={!canSave}
          onClick={handleCreate}
          className="w-full py-3.5 rounded-2xl text-[15px] font-sans font-semibold text-white transition-opacity disabled:opacity-40 mt-3"
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", boxShadow: "0 6px 20px rgba(139,116,224,0.4)" }}
        >
          {saving ? "Création…" : "Créer l'activité"}
        </button>
      </main>
    </div>
  );
}
