import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Loader2, Wrench, HeartOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface StepMaterielProps {
  prenomEnfant: string;
  enfantId: string;
  onNext: () => void;
  onSkip: () => void;
}

interface SavedMateriel {
  id: string;
  nom: string;
  conseils?: string;
}

export function StepMateriel({ prenomEnfant, enfantId, onNext, onSkip }: StepMaterielProps) {
  const [phase, setPhase] = useState<"qualify" | "form">("qualify");
  const [items, setItems] = useState<SavedMateriel[]>([]);

  const [nom, setNom] = useState("");
  const [conseils, setConseils] = useState("");
  const [dateReception, setDateReception] = useState("");
  const [adding, setAdding] = useState(false);

  const resetForm = () => {
    setNom("");
    setConseils("");
    setDateReception("");
  };

  const addItem = async () => {
    const trimmed = nom.trim();
    if (!trimmed) return;
    setAdding(true);

    try {
      const { data, error } = await supabase
        .from("materiel")
        .insert({
          enfant_id: enfantId,
          nom: trimmed,
          conseils: conseils.trim() || null,
          date_reception: dateReception || null,
        })
        .select("id")
        .single();

      if (!error && data) {
        setItems((prev) => [...prev, { id: data.id, nom: trimmed, conseils: conseils.trim() || undefined }]);
        resetForm();
      }
    } catch {
      // silent
    } finally {
      setAdding(false);
    }
  };

  const removeItem = async (id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
    try { await supabase.from("materiel").delete().eq("id", id); } catch { /* silent */ }
  };

  // Phase 1: Qualification
  if (phase === "qualify") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1
            className="text-[32px] font-semibold text-card-foreground leading-tight"
            style={{ fontFamily: "'Fraunces', serif" }}
          >
            Du matériel spécifique&nbsp;?
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
            Appareillages, orthèses, matériel médical — renseignez le matériel utilisé par {prenomEnfant}.
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setPhase("form")}
            className="w-full rounded-xl border border-white/60 bg-white/50 p-5 text-left hover:bg-white/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}>
                <Wrench className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-card-foreground text-[15px]" style={{ fontFamily: "DM Sans" }}>
                  Oui, je veux le renseigner
                </p>
                <p className="text-muted-foreground text-xs mt-0.5" style={{ fontFamily: "DM Sans" }}>
                  Ajoutez un ou plusieurs équipements
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
                  Non, pas de matériel spécifique
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
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Le matériel de {prenomEnfant}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
          Appareillages, orthèses, matériel médical — tout ce qu'il faut savoir pour s'en occuper.
        </p>
      </div>

      {/* Added items */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="bg-[#FAEEDA] rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-medium text-card-foreground text-sm" style={{ fontFamily: "DM Sans" }}>
                  {item.nom}
                </p>
                {item.conseils && (
                  <p className="text-muted-foreground text-xs mt-0.5">
                    {item.conseils}
                  </p>
                )}
              </div>
              <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-foreground ml-2 shrink-0">
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
            Nom du matériel *
          </label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            placeholder="ex : Fauteuil roulant, Nébuliseur, Orthèse..."
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Conseils d'utilisation
          </label>
          <Textarea
            value={conseils}
            onChange={(e) => setConseils(e.target.value)}
            placeholder="ex : Régler la sangle avant chaque utilisation..."
            className="rounded-xl w-full"
            disabled={adding}
          />
        </div>

        <div>
          <label className="text-sm font-medium text-card-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
            Date de réception
          </label>
          <Input
            type="date"
            value={dateReception}
            onChange={(e) => setDateReception(e.target.value)}
            className="rounded-xl"
            disabled={adding}
          />
        </div>

        <Button
          onClick={addItem}
          disabled={!nom.trim() || adding}
          className="w-full rounded-xl h-11"
          variant="outline"
        >
          {adding ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Ajouter ce matériel
        </Button>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={onNext}
          disabled={items.length === 0}
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
