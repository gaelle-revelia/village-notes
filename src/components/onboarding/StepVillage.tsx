import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Intervenant {
  nom: string;
  specialite: string;
  structure?: string;
}

interface StepVillageProps {
  prenomEnfant: string;
  onNext: (intervenants: Intervenant[]) => void;
  onSkip: () => void;
}

export function StepVillage({ prenomEnfant, onNext, onSkip }: StepVillageProps) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [nom, setNom] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [structure, setStructure] = useState("");
  const [showAutreInput, setShowAutreInput] = useState(false);
  const [autreValue, setAutreValue] = useState("");
  const [defaultSpecialties, setDefaultSpecialties] = useState<string[]>([]);
  const autreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    supabase
      .from("specialties")
      .select("name")
      .eq("is_default", true)
      .order("name")
      .then(({ data }) => {
        if (data) setDefaultSpecialties(data.map((d) => d.name));
      });
  }, []);

  const handleAutreClick = () => {
    if (showAutreInput) {
      setShowAutreInput(false);
      setAutreValue("");
      if (specialite && !defaultSpecialties.includes(specialite)) {
        setSpecialite("");
      }
    } else {
      setShowAutreInput(true);
      setSpecialite("");
      setTimeout(() => autreInputRef.current?.focus(), 0);
    }
  };

  const confirmAutre = async () => {
    const trimmed = autreValue.trim();
    if (!trimmed) return;

    const normalized = trimmed.toLowerCase();

    // Check if already exists
    const { data: existing } = await supabase
      .from("specialties")
      .select("name")
      .eq("name_normalized", normalized)
      .maybeSingle();

    if (existing) {
      setSpecialite(existing.name);
    } else {
      // Insert new custom specialty
      const { data: inserted } = await supabase
        .from("specialties")
        .insert({ name: trimmed, name_normalized: normalized, is_default: false })
        .select("name")
        .single();

      setSpecialite(inserted?.name ?? trimmed);
    }

    setShowAutreInput(false);
    setAutreValue("");
  };

  const addIntervenant = () => {
    if (!nom.trim()) return;
    setIntervenants([...intervenants, { nom: nom.trim(), specialite, structure: structure.trim() || undefined }]);
    setNom("");
    setSpecialite("");
    setStructure("");
    setShowForm(false);
  };

  const removeIntervenant = (index: number) => {
    setIntervenants(intervenants.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground">Votre village de soins</h1>
        <p className="text-muted-foreground">
          Qui accompagne {prenomEnfant} ? Vous pourrez toujours en ajouter plus tard.
        </p>
      </div>

      {intervenants.length > 0 && (
        <div className="space-y-2">
          {intervenants.map((int, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border bg-card px-4 py-3"
            >
              <div>
                <p className="font-medium text-card-foreground">{int.nom}</p>
                {int.specialite && (
                  <p className="text-sm text-muted-foreground">{int.specialite}</p>
                )}
                {int.structure && (
                  <p className="text-xs text-muted-foreground">{int.structure}</p>
                )}
              </div>
              <button
                onClick={() => removeIntervenant(i)}
                className="text-muted-foreground hover:text-destructive p-1"
                aria-label="Supprimer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="space-y-2">
            <Label htmlFor="int-nom">Nom ou prénom</Label>
            <Input
              id="int-nom"
              value={nom}
              onChange={(e) => setNom(e.target.value)}
              className="rounded-lg"
              maxLength={100}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="int-specialite">Spécialité</Label>
           <div className="flex flex-wrap gap-2">
              {defaultSpecialties.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setSpecialite(s); setShowAutreInput(false); setAutreValue(""); }}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    specialite === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
              <button
                type="button"
                onClick={handleAutreClick}
                className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                  (showAutreInput || (specialite && !defaultSpecialties.includes(specialite)))
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:border-primary"
                }`}
              >
                {specialite && !defaultSpecialties.includes(specialite) && !showAutreInput
                  ? specialite
                  : "Autre"}
              </button>
            </div>
            {showAutreInput && (
              <div className="flex gap-2 mt-2">
                <Input
                  ref={autreInputRef}
                  value={autreValue}
                  onChange={(e) => setAutreValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmAutre(); } }}
                  placeholder="Ex : Neuropsychologue, Orthoptiste..."
                  className="rounded-lg flex-1"
                  maxLength={100}
                />
                <Button
                  type="button"
                  size="icon"
                  onClick={confirmAutre}
                  disabled={!autreValue.trim()}
                  className="rounded-lg shrink-0"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="int-structure">Cabinet ou centre (optionnel)</Label>
            <Input
              id="int-structure"
              value={structure}
              onChange={(e) => setStructure(e.target.value)}
              className="rounded-lg"
              maxLength={150}
              placeholder="Ex : CAMPS de Brest, Cabinet Quimper..."
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              onClick={addIntervenant}
              disabled={!nom.trim()}
              className="flex-1 rounded-xl"
            >
              Ajouter
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setNom(""); setSpecialite(""); setStructure(""); }}
              className="rounded-xl"
            >
              Annuler
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="h-4 w-4" />
          Ajouter un intervenant
        </button>
      )}

      <div className="space-y-3 pt-2">
        <Button
          onClick={() => onNext(intervenants)}
          className="w-full rounded-xl h-12 text-base"
        >
          Continuer
        </Button>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Passer cette étape
        </button>
      </div>
    </div>
  );
}
