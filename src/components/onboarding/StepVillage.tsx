import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X, Plus } from "lucide-react";

interface Intervenant {
  nom: string;
  specialite: string;
}

interface StepVillageProps {
  prenomEnfant: string;
  onNext: (intervenants: Intervenant[]) => void;
  onSkip: () => void;
}

const SPECIALITES = [
  "Kinésithérapeute",
  "Ergothérapeute",
  "Psychomotricien",
  "Médecin MPR",
  "Orthophoniste",
  "Autre",
];

export function StepVillage({ prenomEnfant, onNext, onSkip }: StepVillageProps) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [nom, setNom] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [showForm, setShowForm] = useState(false);

  const addIntervenant = () => {
    if (!nom.trim()) return;
    setIntervenants([...intervenants, { nom: nom.trim(), specialite }]);
    setNom("");
    setSpecialite("");
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
              {SPECIALITES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpecialite(s)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    specialite === s
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-background text-foreground hover:border-primary"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
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
              onClick={() => { setShowForm(false); setNom(""); setSpecialite(""); }}
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
