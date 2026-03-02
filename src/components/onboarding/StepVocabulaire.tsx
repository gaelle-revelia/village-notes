import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface LexiqueEntry {
  mot_transcrit: string;
  mot_correct: string;
}

interface StepVocabulaireProps {
  prenomEnfant: string;
  enfantId: string;
  intervenants: Array<{ nom: string; specialite?: string; structure?: string }>;
  onNext: (entries: LexiqueEntry[]) => void;
  onSkip: () => void;
}

export function StepVocabulaire({
  prenomEnfant,
  enfantId,
  intervenants,
  onNext,
  onSkip,
}: StepVocabulaireProps) {
  const [entries, setEntries] = useState<LexiqueEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newTranscrit, setNewTranscrit] = useState("");
  const [newCorrect, setNewCorrect] = useState("");

  useEffect(() => {
    const generate = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("generate-lexique", {
          body: { prenom_enfant: prenomEnfant, intervenants },
        });

        if (!error && data?.entries?.length > 0) {
          setEntries(data.entries);
        }
      } catch {
        // silent — show empty state
      } finally {
        setLoading(false);
      }
    };

    generate();
  }, [prenomEnfant, intervenants]);

  const removeEntry = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof LexiqueEntry, value: string) => {
    setEntries((prev) =>
      prev.map((e, i) => (i === index ? { ...e, [field]: value } : e))
    );
  };

  const addEntry = () => {
    if (!newTranscrit.trim() || !newCorrect.trim()) return;
    setEntries((prev) => [
      ...prev,
      { mot_transcrit: newTranscrit.trim(), mot_correct: newCorrect.trim() },
    ]);
    setNewTranscrit("");
    setNewCorrect("");
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Analyse de votre vocabulaire...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground leading-tight">
          Des mots qui vous appartiennent
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Nous avons repéré des mots spécifiques à votre quotidien. Vérifiez-les et
          ajoutez ceux que nous aurions manqués — vos notes vocales n'en seront que
          plus fidèles.
        </p>
      </div>

      {entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-2 rounded-xl border bg-card px-4 py-3"
            >
              <Input
                value={entry.mot_transcrit}
                onChange={(e) => updateEntry(i, "mot_transcrit", e.target.value)}
                className="flex-1 rounded-lg border-0 bg-transparent px-0 text-sm text-muted-foreground focus-visible:ring-0"
                placeholder="Variante"
              />
              <span className="text-muted-foreground text-xs shrink-0">→</span>
              <Input
                value={entry.mot_correct}
                onChange={(e) => updateEntry(i, "mot_correct", e.target.value)}
                className="flex-1 rounded-lg border-0 bg-transparent px-0 text-sm font-medium text-card-foreground focus-visible:ring-0"
                placeholder="Correct"
              />
              <button
                onClick={() => removeEntry(i)}
                className="text-muted-foreground hover:text-destructive p-1 shrink-0"
                aria-label="Supprimer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {entries.length === 0 && !showForm && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Aucun mot détecté. Ajoutez vos propres correspondances ci-dessous.
        </p>
      )}

      {showForm ? (
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex gap-2">
            <Input
              value={newTranscrit}
              onChange={(e) => setNewTranscrit(e.target.value)}
              placeholder="Ce que vous dites"
              className="flex-1 rounded-lg"
              autoFocus
            />
            <Input
              value={newCorrect}
              onChange={(e) => setNewCorrect(e.target.value)}
              placeholder="Ce qu'il faut écrire"
              className="flex-1 rounded-lg"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEntry();
                }
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={addEntry}
              disabled={!newTranscrit.trim() || !newCorrect.trim()}
              className="flex-1 rounded-xl"
            >
              Ajouter
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setNewTranscrit("");
                setNewCorrect("");
              }}
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
          Ajouter un mot
        </button>
      )}

      <div className="space-y-3 pt-2">
        <Button
          onClick={() => onNext(entries)}
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
