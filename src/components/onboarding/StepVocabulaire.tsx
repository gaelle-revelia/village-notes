import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { VoiceBanner } from "@/components/vocabulaire/VoiceBanner";
import { VocabBlock } from "@/components/vocabulaire/VocabBlock";

interface LexiqueEntry {
  mot_transcrit: string;
  mot_correct: string;
  source: string;
}

interface StepVocabulaireProps {
  prenomEnfant: string;
  enfantId: string;
  intervenants: Array<{ nom: string; specialite?: string; structure?: string }>;
  onNext: (entries: LexiqueEntry[]) => void;
  onSkip: () => void;
}

/** Group entries by mot_correct */
function groupByMotCorrect(entries: LexiqueEntry[]) {
  const map = new Map<string, { source: string; variantes: string[] }>();
  for (const e of entries) {
    const existing = map.get(e.mot_correct);
    if (existing) {
      if (!existing.variantes.includes(e.mot_transcrit)) {
        existing.variantes.push(e.mot_transcrit);
      }
    } else {
      map.set(e.mot_correct, { source: e.source, variantes: [e.mot_transcrit] });
    }
  }
  return map;
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
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);

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
        // silent
      } finally {
        setLoading(false);
      }
    };
    generate();
  }, [prenomEnfant, intervenants]);

  const addManualWord = async () => {
    const word = newWord.trim();
    if (!word) return;
    setAddingWord(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lexique", {
        body: { mots: [word] },
      });
      if (!error && data?.entries?.length > 0) {
        setEntries((prev) => [...prev, ...data.entries]);
      } else {
        // Fallback: add entry without AI variantes
        setEntries((prev) => [...prev, { mot_transcrit: word, mot_correct: word, source: "manual" }]);
      }
    } catch {
      setEntries((prev) => [...prev, { mot_transcrit: word, mot_correct: word, source: "manual" }]);
    } finally {
      setNewWord("");
      setAddingWord(false);
    }
  };

  const removeBlock = (motCorrect: string) => {
    setEntries((prev) => prev.filter((e) => e.mot_correct !== motCorrect));
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Analyse de votre vocabulaire...</p>
      </div>
    );
  }

  // Filter: only show structure + manual entries; prenom entries are hidden
  const visibleEntries = entries.filter((e) => e.source !== "onboarding_prenom");
  const grouped = groupByMotCorrect(visibleEntries);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1
          className="text-[32px] font-semibold text-card-foreground leading-tight"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Des mots qui vous appartiennent
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed" style={{ fontFamily: "DM Sans" }}>
          Nous avons repéré des noms de lieux et structures liés à votre parcours.
          Vérifiez-les et ajoutez vos propres mots — vos notes vocales n'en seront que plus fidèles.
        </p>
      </div>

      <VoiceBanner />

      {grouped.size > 0 && (
        <div className="space-y-2">
          {Array.from(grouped.entries()).map(([motCorrect, { variantes }]) => (
            <VocabBlock
              key={motCorrect}
              motCorrect={motCorrect}
              variantes={variantes.map((v, i) => ({ id: `temp-${motCorrect}-${i}`, mot_transcrit: v }))}
              isEditing={false}
              onStartEdit={() => {}}
              onCancelEdit={() => {}}
              onRename={async () => {}}
              onRemoveBlock={() => removeBlock(motCorrect)}
              onRemoveVariant={() => {}}
              onAddVariant={() => {}}
            />
          ))}
        </div>
      )}

      {grouped.size === 0 && (
        <p className="text-center text-sm text-muted-foreground py-4">
          Aucun mot détecté. Ajoutez vos propres mots ci-dessous.
        </p>
      )}

      {/* Add word input */}
      <div className="flex gap-2">
        <Input
          value={newWord}
          onChange={(e) => setNewWord(e.target.value)}
          placeholder="Ajouter un mot (ex: Motilo)"
          className="flex-1 rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addManualWord();
            }
          }}
          disabled={addingWord}
        />
        <Button
          onClick={addManualWord}
          disabled={!newWord.trim() || addingWord}
          size="icon"
          className="rounded-xl shrink-0"
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
        >
          <Plus className="h-4 w-4 text-white" />
        </Button>
      </div>

      <div className="space-y-3 pt-2">
        <Button
          onClick={() => onNext(entries)}
          className="w-full rounded-xl h-12 text-base"
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
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
