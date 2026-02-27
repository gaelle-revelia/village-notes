import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

interface IntervenantPickerProps {
  enfantId: string | null;
  onSelect: (id: string) => void;
  onSkip: () => void;
  onTextMode: () => void;
}

export function IntervenantPicker({ enfantId, onSelect, onSkip, onTextMode }: IntervenantPickerProps) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enfantId) {
      setLoading(false);
      return;
    }
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .order("nom")
      .then(({ data }) => {
        setIntervenants(data || []);
        setLoading(false);
      });
  }, [enfantId]);

  if (loading) {
    return (
      <div className="text-center text-muted-foreground animate-pulse">Chargement...</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-card-foreground">
          Avec quel intervenant ?
        </h2>
        <p className="text-sm text-muted-foreground">
          Associer un professionnel aide à mieux organiser vos notes.
        </p>
      </div>

      {intervenants.length > 0 ? (
        <div className="space-y-2">
          {intervenants.map((int) => (
            <button
              key={int.id}
              onClick={() => onSelect(int.id)}
              className="flex w-full items-center rounded-xl border bg-card px-4 py-3 text-left hover:border-primary transition-colors"
            >
              <div>
                <p className="font-medium text-card-foreground">{int.nom}</p>
                {int.specialite && (
                  <p className="text-sm text-muted-foreground">{int.specialite}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun intervenant enregistré.</p>
      )}

      <div className="space-y-3">
        <Button onClick={onSkip} className="w-full rounded-xl h-12 text-base">
          {intervenants.length > 0 ? "Sans intervenant" : "Continuer"}
        </Button>

        <button
          onClick={onTextMode}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
        >
          <Keyboard className="h-3.5 w-3.5" />
          Saisir en texte directement
        </button>
      </div>
    </div>
  );
}
