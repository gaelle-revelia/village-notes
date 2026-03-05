import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface StepEnfantProps {
  onNext: (data: { prenom: string; dateNaissance: string; diagnostic: string; prenomParent: string }) => void;
}

export function StepEnfant({ onNext }: StepEnfantProps) {
  const [prenomParent, setPrenomParent] = useState("");
  const [prenom, setPrenom] = useState("");
  const [dateNaissance, setDateNaissance] = useState("");
  const [diagnostic, setDiagnostic] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prenom.trim()) {
      setError("Le prénom est obligatoire");
      return;
    }
    onNext({ prenom: prenom.trim(), dateNaissance, diagnostic: diagnostic.trim(), prenomParent: prenomParent.trim() });
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
