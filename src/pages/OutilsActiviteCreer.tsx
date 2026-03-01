import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
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

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

type TrackMode = "temps" | "distance" | "les_deux";

export default function OutilsActiviteCreer() {
  const navigate = useNavigate();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();

  const [nom, setNom] = useState("");
  const [domaine, setDomaine] = useState("Moteur");
  const [trackMode, setTrackMode] = useState<TrackMode>("temps");
  const [unite, setUnite] = useState<"metres" | "km">("metres");
  const [saving, setSaving] = useState(false);

  const showDistance = trackMode === "distance" || trackMode === "les_deux";
  const canSave = nom.trim().length > 0 && enfantId && !saving;

  const handleCreate = async () => {
    if (!canSave) return;
    setSaving(true);
    const { error } = await supabase.from("activites").insert({
      enfant_id: enfantId!,
      nom: nom.trim(),
      domaine,
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
        <button onClick={() => navigate("/outils/activites")} className="flex items-center gap-1 text-sm font-sans" style={{ color: "#8B74E0" }}>
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-serif font-semibold text-foreground">Nouvelle activité</h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-28 flex flex-col gap-5">
        {/* Nom */}
        <div style={glassCard} className="p-4 flex flex-col gap-2">
          <label className="text-[11px] font-sans font-semibold uppercase tracking-wider" style={{ color: "#9A9490" }}>
            Nom de l'activité
          </label>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="Ex : Marche, Vélo, Natation…"
            className="bg-transparent border-none outline-none text-[15px] font-sans text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Domaine */}
        <div style={glassCard} className="p-4 flex flex-col gap-3">
          <label className="text-[11px] font-sans font-semibold uppercase tracking-wider" style={{ color: "#9A9490" }}>
            Domaine
          </label>
          <div className="flex items-center justify-between px-2">
            {DOMAINS.map((d) => (
              <button
                key={d.label}
                onClick={() => setDomaine(d.label)}
                className="flex flex-col items-center gap-1.5"
              >
                <div
                  className="rounded-full transition-all"
                  style={{
                    width: 28,
                    height: 28,
                    background: domaine === d.label ? d.color : "transparent",
                    border: `2.5px solid ${d.color}`,
                    opacity: domaine === d.label ? 1 : 0.35,
                    boxShadow: domaine === d.label ? `0 0 0 5px ${d.color}38` : "none",
                  }}
                />
                <span className="text-[9px] font-sans font-medium" style={{ color: domaine === d.label ? d.color : "#9A9490" }}>
                  {d.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Track mode */}
        <div style={glassCard} className="p-4 flex flex-col gap-3">
          <label className="text-[11px] font-sans font-semibold uppercase tracking-wider" style={{ color: "#9A9490" }}>
            Ce que tu suis
          </label>
          <div className="flex gap-2">
            {TRACK_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setTrackMode(o.value)}
                className="flex-1 py-2 rounded-xl text-[13px] font-sans font-medium transition-all"
                style={{
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
          <div style={glassCard} className="p-4 flex flex-col gap-3">
            <label className="text-[11px] font-sans font-semibold uppercase tracking-wider" style={{ color: "#9A9490" }}>
              Unité de distance
            </label>
            <div className="flex gap-2">
              {([["metres", "Mètres"], ["km", "Kilomètres"]] as const).map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => setUnite(val)}
                  className="flex-1 py-2 rounded-xl text-[13px] font-sans font-medium transition-all"
                  style={{
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
      </main>

      {/* CTA */}
      <div className="fixed bottom-20 left-0 right-0 px-4">
        <button
          disabled={!canSave}
          onClick={handleCreate}
          className="w-full py-3.5 rounded-2xl text-[15px] font-sans font-semibold text-white transition-opacity disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", boxShadow: "0 6px 20px rgba(139,116,224,0.4)" }}
        >
          {saving ? "Création…" : "Créer l'activité"}
        </button>
      </div>
    </div>
  );
}
