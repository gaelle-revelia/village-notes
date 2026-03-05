import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepEnfantProps {
  onNext: (data: { prenom: string; dateNaissance: string; diagnostic: string; prenomParent: string; sexe: string | null }) => void;
}

export function StepEnfant({ onNext }: StepEnfantProps) {
  const [prenomParent, setPrenomParent] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [sexe, setSexe] = useState<string | null>(null);
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim()) {
      setError("Le prénom est obligatoire");
      return;
    }
    onNext({ prenom: prenom.trim(), dateNaissance, diagnostic: diagnostic.trim(), prenomParent: prenomParent.trim(), sexe });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground">Parlons de votre enfant</h1>
        <p className="text-muted-foreground">
          Ces informations restent privées et ne sont jamais partagées.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="prenom-parent">Votre prénom</Label>
          <Input
            id="prenom-parent"
            value={prenomParent}
            onChange={(e) => setPrenomParent(e.target.value)}
            placeholder="ex : Gaëlle"
            className="rounded-lg"
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="prenom">Son prénom</Label>
          <Input
            id="prenom"
            value={prenom}
            onChange={(e) => { setPrenom(e.target.value); setError(""); }}
            required
            className="rounded-lg"
            maxLength={100}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="space-y-2">
          <Label>Son genre (pour personnaliser les textes)</Label>
          <div className="flex gap-3">
            {[
              { value: "F", label: "Fille" },
              { value: "M", label: "Garçon" },
            ].map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSexe(sexe === opt.value ? null : opt.value)}
                className="flex-1 rounded-xl py-2.5 text-sm font-medium font-sans transition-all"
                style={{
                  background: sexe === opt.value
                    ? "linear-gradient(135deg, #E8736A, #8B74E0)"
                    : "rgba(255,255,255,0.55)",
                  color: sexe === opt.value ? "#fff" : "#1E1A1A",
                  border: sexe === opt.value ? "none" : "1px solid rgba(255,255,255,0.85)",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="date-naissance">Sa date de naissance (optionnel)</Label>
          <Input
            id="date-naissance"
            type="date"
            value={dateNaissance}
            onChange={(e) => setDateNaissance(e.target.value)}
            className="rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="diagnostic">Sa situation ou son diagnostic (optionnel)</Label>
          <Input
            id="diagnostic"
            value={diagnostic}
            onChange={(e) => setDiagnostic(e.target.value)}
            placeholder="ex : paralysie cérébrale, TSA, en cours de diagnostic..."
            className="rounded-lg"
            maxLength={500}
          />
        </div>

        <Button type="submit" className="w-full rounded-xl h-12 text-base">
          Continuer
        </Button>
      </form>
    </div>
  );
}
