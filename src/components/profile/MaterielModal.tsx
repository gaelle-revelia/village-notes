import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MaterielModalProps {
  open: boolean;
  enfantId: string;
  initialData?: {
    id: string;
    nom: string;
    conseils?: string | null;
    date_reception?: string | null;
  };
  onSave: () => void;
  onClose: () => void;
}

export function MaterielModal({ open, enfantId, initialData, onSave, onClose }: MaterielModalProps) {
  const [nom, setNom] = useState("");
  const [conseils, setConseils] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setNom(initialData.nom);
        setConseils(initialData.conseils || "");
        setDateReception(initialData.date_reception || "");
      } else {
        setNom("");
        setConseils("");
        setDateReception("");
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
        conseils: conseils.trim() || null,
        date_reception: dateReception || null,
      };

      if (initialData) {
        await supabase.from("materiel").update(payload).eq("id", initialData.id);
      } else {
        await supabase.from("materiel").insert(payload);
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
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.5)" }} onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 z-50">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <h2 className="text-xl font-semibold text-card-foreground mb-5" style={{ fontFamily: "'Fraunces', serif" }}>
          {initialData ? "Modifier le matériel" : "Nouveau matériel"}
        </h2>

        <div className="space-y-4">
          <Field label="Nom du matériel *">
            <Input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="ex : Fauteuil roulant, Nébuliseur..." className="rounded-xl" disabled={saving} />
          </Field>
          <Field label="Conseils d'utilisation">
            <Textarea value={conseils} onChange={(e) => setConseils(e.target.value)} placeholder="ex : Régler la sangle avant chaque utilisation..." className="rounded-xl w-full" disabled={saving} />
          </Field>
          <Field label="Date de réception">
            <Input type="date" value={dateReception} onChange={(e) => setDateReception(e.target.value)} className="rounded-xl" disabled={saving} />
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
