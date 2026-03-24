import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, HeartPulse, HeartOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepSoinsProps {
  prenomEnfant: string;
  enfantId: string;
  onNext: () => void;
  onSkip: () => void;
}

interface SavedSoin {
  id: string;
  nom: string;
  description?: string;
  frequence?: string;
}

export function StepSoins({ prenomEnfant, enfantId, onNext, onSkip }: StepSoinsProps) {
  const [phase, setPhase] = useState<"qualify" | "form">("qualify");
  const [soins, setSoins] = useState<SavedSoin[]>([]);

  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [frequence, setFrequence] = useState("");
  const [instructions, setInstructions] = useState("");
  const [materiel, setMateriel] = useState("");
  const [signesAlerte, setSignesAlerte] = useState("");
  const [adding, setAdding] = useState(false);

  const resetForm = () => {
    setNom("");
    setDescription("");
    setFrequence("");
    setInstructions("");
    setMateriel("");
    setSignesAlerte("");
  };

  const addSoin = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    setAdding(true);

    try {
      const { data, error } = await supabase
        .from("soins")
        .insert({
          enfant_id: enfantId,
          nom: trimmed,
          description: description.trim() || null,
          frequence: frequence.trim() || null,
          instructions: instructions.trim() || null,
          materiel: materiel.trim() || null,
          signes_alerte: signesAlerte.trim() || null,
        })
        .select("id")
        .single();

      if (!error && data) {
        setSoins((prev) => [...prev, { id: data.id, nom: trimmed, description: description.trim() || undefined, frequence: frequence.trim() || undefined }]);
        resetForm();
      }
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  };

  const removeSoin = async (id: string) => {
    setSoins((prev) => prev.filter((s) => s.id !== id));
    try { await supabase.from("soins").delete().eq("id", id); } catch { /* silent */ }
  };

  // Phase 1: Qualification
  if (phase === "qualify") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1
            className="text-[32px] font-semibold text-card-foreground leading-tight"
            style={{ fontFamily: "Fraunces" }}
          >
            {prenomEnfant} a-t-il des soins spécifiques&nbsp;?
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
            Décrivez les gestes techniques ou soins quotidiens pour que toute personne qui s'occupe de votre enfant puisse les retrouver.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPhase("form")}
            className="w-full rounded-xl border border-white/60 bg-white/50 p-5 text-left hover:bg-white/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}>
                <HeartPulse className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-card-foreground text-[15px]" style={{ fontFamily: "DM Sans" }}>
                  Oui, je veux le décrire
                </p>
                <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: "DM Sans" }}>
                  Ajoutez un ou plusieurs soins
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={onSkip}
            className="w-full rounded-xl border border-white/60 bg-white/50 p-5 text-left hover:bg-white/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                <HeartOff className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-card-foreground text-[15px]" style={{ fontFamily: "DM Sans" }}>
                  Non, pas de soin spécifique
                </p>
                <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: "DM Sans" }}>
                  Vous pourrez en ajouter plus tard
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  // Phase 2: Form
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-[32px] font-semibold text-card-foreground leading-tight"
          style={{ fontFamily: "Fraunces" }}
        >
          Soins de {prenomEnfant}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
          Décrivez les gestes techniques ou soins quotidiens.
        </p>
      </div>

      {/* Added soins */}
      {soins.length > 0 && (
        <div className="space-y-2">
          {soins.map((s) => (
            <div key={s.id} className="bg-[#E1F5EE] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground text-sm" style={{ fontFamily: "DM Sans" }}>
                  {s.nom}
                </p>
                {(s.description || s.frequence) && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {[s.description, s.frequence].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button onClick={() => removeSoin(s.id)} className="text-muted-foreground hover:text-foreground ml-2 shrink-0">
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Nom du soin *
          </label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Gastrostomie, Kiné respi..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Description
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="ex : Alimentation par sonde..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Fréquence
          </label>
          <Input
            value={frequence}
            onChange={(e) => setFrequence(e.target.value)}
            placeholder="ex : À chaque repas, matin et soir..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Instructions
          </label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder={"1. ...\n2. ..."}
            className="rounded-xl w-full"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Matériel nécessaire
          </label>
          <Input
            value={materiel}
            onChange={(e) => setMateriel(e.target.value)}
            placeholder="ex : Seringue 60ml, kit MIC-KEY..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Signes d'alerte
          </label>
          <Textarea
            value={signesAlerte}
            onChange={(e) => setSignesAlerte(e.target.value)}
            placeholder="ex : Si le bouton s'arrache..."
            className="rounded-xl w-full"
            disabled={adding}
          />
        </div>

        <Button
          onClick={addSoin}
          disabled={!nom.trim() || adding}
          className="w-full rounded-xl h-11"
          variant="outline"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ajouter ce soin
        </Button>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={onNext}
          disabled={soins.length === 0}
          className="w-full rounded-xl h-12 text-base text-white"
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
        >
          Continuer
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Compléter plus tard
        </button>
      </div>
    </div>
  );
}
