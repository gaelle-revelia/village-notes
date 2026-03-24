import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MedicamentModalProps {
  open: boolean;
  enfantId: string;
  initialData?: {
    id: string;
    nom: string;
    dosage?: string | null;
    voie?: string | null;
    frequence?: string | null;
    instructions?: string | null;
    conditions?: string | null;
  };
  onSave: () => void;
  onClose: () => void;
}

const VOIE_OPTIONS = ["Oral", "Gastrostomie", "Patch", "Inhalé", "Autre"];
const FREQ_OPTIONS = ["Matin", "Midi", "Soir", "Au besoin", "Autre"];

export function MedicamentModal({ open, enfantId, initialData, onSave, onClose }: MedicamentModalProps) {
  const [nom, setNom] = useState("");
  const [dosage, setDosage] = useState("");
  const [voie, setVoie] = useState("");
  const [frequence, setFrequence] = useState<string[]>([]);
  const [instructions, setInstructions] = useState("");
  const [conditions, setConditions] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setNom(initialData.nom);
        setDosage(initialData.dosage || "");
        setVoie(initialData.voie || "");
        setFrequence(initialData.frequence ? initialData.frequence.split(", ") : []);
        setInstructions(initialData.instructions || "");
        setConditions(initialData.conditions || "");
      } else {
        setNom("");
        setDosage("");
        setVoie("");
        setFrequence([]);
        setInstructions("");
        setConditions("");
      }
    }
  }, [open, initialData]);

  const toggleFreq = (f: string) => {
    setFrequence((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));
  };

  const chipClass = (active: boolean) =>
    active
      ? "bg-primary/10 border border-primary text-primary font-medium rounded-full px-3 py-1.5 text-sm cursor-pointer transition-colors"
      : "bg-white/50 border border-white/60 text-muted-foreground rounded-full px-3 py-1.5 text-sm cursor-pointer transition-colors";

  const handleSave = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    setSaving(true);

    try {
      const freqStr = frequence.length > 0 ? frequence.join(", ") : null;
      const payload = {
        enfant_id: enfantId,
        nom: trimmed,
        dosage: dosage.trim() || null,
        voie: voie || null,
        frequence: freqStr,
        instructions: instructions.trim() || null,
        conditions: conditions.trim() || null,
      };

      if (initialData) {
        await supabase.from("medicaments").update(payload).eq("id", initialData.id);
      } else {
        await supabase.from("medicaments").insert(payload);

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
                source: "profil_medicament",
              }));
              await supabase.from("enfant_lexique").insert(rows);
            }
          } catch {
            // silent
          }
        })();
      }

      onSave();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 z-50">
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <h2
          className="text-xl font-semibold text-card-foreground mb-5"
          style={{ fontFamily: "Fraunces" }}
        >
          {initialData ? "Modifier le médicament" : "Nouveau médicament"}
        </h2>

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
              disabled={saving}
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
              disabled={saving}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
              Voie d'administration
            </label>
            <div className="flex flex-wrap gap-2">
              {VOIE_OPTIONS.map((v) => (
                <button
                  key={v}
                  type="button"
                  className={chipClass(voie === v)}
                  onClick={() => setVoie(voie === v ? "" : v)}
                  disabled={saving}
                >
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
                <button
                  key={f}
                  type="button"
                  className={chipClass(frequence.includes(f))}
                  onClick={() => toggleFreq(f)}
                  disabled={saving}
                >
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>
        </div>

        <div className="space-y-3 mt-6">
          <button
            onClick={handleSave}
            disabled={!nom.trim() || saving}
            className="w-full rounded-xl h-12 text-base text-white font-medium flex items-center justify-center disabled:opacity-50"
            style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Enregistrer
          </button>
          <button
            onClick={onClose}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
