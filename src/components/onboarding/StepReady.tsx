import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface StepReadyProps {
  prenomEnfant: string;
}

export function StepReady({ prenomEnfant }: StepReadyProps) {
  const navigate = useNavigate();

  return (
    <div className="space-y-8 text-center">
      <div className="space-y-3">
        <h1 className="text-[32px] font-semibold text-card-foreground">Votre espace est prêt</h1>
        <p className="text-foreground text-lg">
          Bienvenue dans The Village. Votre mémoire commence maintenant.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          onClick={() => navigate("/timeline")}
          className="w-full rounded-xl h-12 text-base"
        >
          Enregistrer mon premier mémo
        </Button>
        <button
          onClick={() => navigate("/timeline")}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Voir ma timeline
        </button>
      </div>
    </div>
  );
}
