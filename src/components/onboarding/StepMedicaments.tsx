import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Pill, HeartOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepMedicamentsProps {
  prenomEnfant: string;
  enfantId: string;
  onNext: () => void;
  onSkip: () => void;
}

interface SavedMed {
  id: string;
  nom: string;
  dosage?: string;
  voie?: string;
  frequence?: string;
}

const VOIE_OPTIONS = ["Oral", "Gastrostomie", "Patch", "Inhalé", "Autre"];
const FREQ_OPTIONS = ["Matin", "Midi", "Soir", "Au besoin", "Autre"];

export function StepMedicaments({ prenomEnfant, enfantId, onNext, onSkip }: StepMedicamentsProps) {
  const [phase, setPhase] = useState<"qualify" | "form">("qualify");
  const [meds, setMeds] = useState<SavedMed[]>([]);

  // Form state
  const [nom, setNom] = useState("");
  const [dosage, setDosage] = useState("");
  const [voie, setVoie] = useState("");
  const [frequence, setFrequence] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [conditions, setConditions] = useState("");
  const [adding, setAdding] = useState(false);

  const resetForm = () => {
    setNom("");
    setDosage("");
    setVoie("");
    setFrequence([]);
    setInstructions("");
    setConditions("");
  };

  const toggleFreq = (f: string) => {
    setFrequence((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const addMed = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    setAdding(true);

    try {
      const freqStr = frequence.length > 0 ? frequence.join(", ") : undefined;
      const { data, error } = await supabase
        .from("medicaments")
        .insert({
          enfant_id: enfantId,
          nom: trimmed,
          dosage: dosage.trim() || null,
          voie: voie || null,
          frequence: freqStr || null,
          instructions: instructions.trim() || null,
          conditions: conditions.trim() || null,
        })
        .select("id")
        .single();

      if (!error && data) {
        setMeds((prev) => [...prev, { id: data.id, nom: trimmed, dosage: dosage.trim() || undefined, voie: voie || undefined, frequence: freqStr }]);
        resetForm();

        // Fire-and-forget lexique generation
        (async () => {
          try {
            const { data: lexData } = await supabase.functions.invoke("generate-lexique", {
              body: { mots: [trimmed] },
            });
            if (lexData?.entries?.length > 0) {
              const rows = lexData.entries.map((e: { mot_transcrit: string; mot_correct: string }) => ({
                enfant_id: enfantId,
                mot_transcrit: e.mot_transcrit,
                mot_correct: e.mot_correct,
                source: "onboarding_medicament",
              }));
              await supabase.from("enfant_lexique").insert(rows);
            }
          } catch {
            // silent
          }
        })();
      }
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  };

  const removeMed = async (id: string) => {
    setMeds((prev) => prev.filter((m) => m.id !== id));
    try { await supabase.from("medicaments").delete().eq("id", id); } catch { /* silent */ }
  };

  const chipClass = (active: boolean) =>
    active
      ? "bg-primary/10 border border-primary text-primary font-medium rounded-full px-3 py-1.5 text-sm cursor-pointer transition-colors"
      : "bg-white/50 border border-white/60 text-muted-foreground rounded-full px-3 py-1.5 text-sm cursor-pointer transition-colors";

  // Phase 1: Qualification
  if (phase === "qualify") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1
            className="text-[32px] font-semibold text-card-foreground leading-tight"
            style={{ fontFamily: "Fraunces" }}
          >
            {prenomEnfant} prend-il un traitement&nbsp;?
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
            Renseigner les médicaments permet de les retrouver facilement et d'améliorer la reconnaissance vocale.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPhase("form")}
            className="w-full rounded-xl border border-white/60 bg-white/50 p-5 text-left hover:bg-white/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}>
                <Pill className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-card-foreground text-[15px]" style={{ fontFamily: "DM Sans" }}>
                  Oui, je veux le renseigner
                </p>
                <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: "DM Sans" }}>
                  Ajoutez un ou plusieurs médicaments
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
                  Non, pas de traitement
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
          Traitement de {prenomEnfant}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
          Ajoutez les médicaments pris régulièrement ou ponctuellement.
        </p>
      </div>

      {/* Added medications */}
      {meds.length > 0 && (
        <div className="space-y-2">
          {meds.map((m) => (
            <div key={m.id} className="bg-[#EEEDFE] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground text-sm" style={{ fontFamily: "DM Sans" }}>
                  {m.nom}
                </p>
                {(m.dosage || m.voie || m.frequence) && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {[m.dosage, m.voie, m.frequence].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
              <button onClick={() => removeMed(m.id)} className="text-muted-foreground hover:text-foreground ml-2 shrink-0">
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
            Nom du médicament *
          </label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Doliprane, Inexium..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Dosage
          </label>
          <Input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="ex : 15mg, 8ml..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Voie d'administration
          </label>
          <div className="flex flex-wrap gap-2">
            {VOIE_OPTIONS.map((v) => (
              <button key={v} type="button" className={chipClass(voie === v)} onClick={() => setVoie(voie === v ? "" : v)} disabled={adding}>
                {v}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Fréquence
          </label>
          <div className="flex flex-wrap gap-2">
            {FREQ_OPTIONS.map((f) => (
              <button key={f} type="button" className={chipClass(frequence.includes(f))} onClick={() => toggleFreq(f)} disabled={adding}>
                {f}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Instructions particulières
          </label>
          <Textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="ex : à prendre pendant le repas..."
            className="rounded-xl w-full"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Conditions
          </label>
          <Input
            value={conditions}
            onChange={(e) => setConditions(e.target.value)}
            placeholder="ex : si douleur, si fièvre > 38.5..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <Button
          onClick={addMed}
          disabled={!nom.trim() || adding}
          className="w-full rounded-xl h-11"
          variant="outline"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ajouter ce médicament
        </Button>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={onNext}
          disabled={meds.length === 0}
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
