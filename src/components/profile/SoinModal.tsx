import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SoinModalProps {
  open: boolean;
  enfantId: string;
  initialData?: {
    id: string;
    nom: string;
    description?: string | null;
    frequence?: string | null;
    instructions?: string | null;
    materiel?: string | null;
    signes_alerte?: string | null;
  };
  onSave: () => void;
  onClose: () => void;
}

export function SoinModal({ open, enfantId, initialData, onSave, onClose }: SoinModalProps) {
  const [nom, setNom] = useState("");
  const [description, setDescription] = useState("");
  const [frequence, setFrequence] = useState("");
  const [instructions, setInstructions] = useState("");
  const [materiel, setMateriel] = useState("");
  const [signesAlerte, setSignesAlerte] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setNom(initialData.nom);
        setDescription(initialData.description || "");
        setFrequence(initialData.frequence || "");
        setInstructions(initialData.instructions || "");
        setMateriel(initialData.materiel || "");
        setSignesAlerte(initialData.signes_alerte || "");
      } else {
        setNom(""); setDescription(""); setFrequence("");
        setInstructions(""); setMateriel(""); setSignesAlerte("");
      }
    }
  }, [open, initialData]);

  const handleSave = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    setSaving(true);

    try {
      const payload = {
        enfant_id: enfantId,
        nom: trimmed,
        description: description.trim() || null,
        frequence: frequence.trim() || null,
        instructions: instructions.trim() || null,
        materiel: materiel.trim() || null,
        signes_alerte: signesAlerte.trim() || null,
      };

      if (initialData) {
        await supabase.from("soins").update(payload).eq("id", initialData.id);
      } else {
        await supabase.from("soins").insert(payload);
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 z-50">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-semibold text-card-foreground mb-5" style={{ fontFamily: "Fraunces" }}>
          {initialData ? "Modifier le soin" : "Nouveau soin"}
        </h2>

        <div className="space-y-4">
          <Field label="Nom du soin *">
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Kiné respiratoire..." className="rounded-xl" disabled={saving} />
          </Field>
          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="ex : drainage bronchique..." className="rounded-xl" disabled={saving} />
          </Field>
          <Field label="Fréquence">
            <Input value={frequence} onChange={(e) => setFrequence(e.target.value)} placeholder="ex : 2 fois par jour..." className="rounded-xl" disabled={saving} />
          </Field>
          <Field label="Instructions">
            <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="ex : après le repas..." className="rounded-xl w-full" disabled={saving} />
          </Field>
          <Field label="Matériel nécessaire">
            <Input value={materiel} onChange={(e) => setMateriel(e.target.value)} placeholder="ex : nébuliseur, masque..." className="rounded-xl" disabled={saving} />
          </Field>
          <Field label="Signes d'alerte">
            <Textarea value={signesAlerte} onChange={(e) => setSignesAlerte(e.target.value)} placeholder="ex : si difficulté respiratoire..." className="rounded-xl w-full" disabled={saving} />
          </Field>
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
          <button onClick={onClose} className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
        {label}
      </label>
      {children}
    </div>
  );
}
