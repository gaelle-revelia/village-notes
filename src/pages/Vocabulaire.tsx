import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { VoiceBanner } from "@/components/vocabulaire/VoiceBanner";
import { VocabBlock } from "@/components/vocabulaire/VocabBlock";

interface LexiqueRow {
  id: string;
  mot_transcrit: string;
  mot_correct: string;
  source: string;
}

function groupByMotCorrect(rows: LexiqueRow[]) {
  const map = new Map<string, { source: string; entries: LexiqueRow[] }>();
  for (const r of rows) {
    const existing = map.get(r.mot_correct);
    if (existing) {
      existing.entries.push(r);
    } else {
      map.set(r.mot_correct, { source: r.source, entries: [r] });
    }
  }
  return map;
}

const Vocabulaire = () => {
  const navigate = useNavigate();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();
  const [rows, setRows] = useState<LexiqueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWord, setNewWord] = useState("");
  const [addingWord, setAddingWord] = useState(false);

  const fetchLexique = useCallback(async () => {
    if (!enfantId) return;
    const { data, error } = await supabase
      .from("enfant_lexique")
      .select("id, mot_transcrit, mot_correct, source")
      .eq("enfant_id", enfantId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setRows(data as LexiqueRow[]);
    }
    setLoading(false);
  }, [enfantId]);

  useEffect(() => {
    fetchLexique();
  }, [fetchLexique]);

  const addManualWord = async () => {
    const word = newWord.trim();
    if (!word || !enfantId) return;
    setAddingWord(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lexique", {
        body: { mots: [word] },
      });
      const entries = (!error && data?.entries?.length > 0)
        ? data.entries
        : [{ mot_transcrit: word, mot_correct: word, source: "manual" }];

      const toInsert = entries.map((e: any) => ({
        enfant_id: enfantId,
        mot_transcrit: e.mot_transcrit,
        mot_correct: e.mot_correct,
        source: e.source || "manual",
      }));

      const { error: insertError } = await supabase.from("enfant_lexique").insert(toInsert);
      if (insertError) {
        toast({ title: "Erreur", description: "Impossible d'ajouter le mot.", variant: "destructive" });
      } else {
        await fetchLexique();
      }
    } catch {
      toast({ title: "Erreur", description: "Impossible d'ajouter le mot.", variant: "destructive" });
    } finally {
      setNewWord("");
      setAddingWord(false);
    }
  };

  const removeBlock = async (motCorrect: string) => {
    if (!enfantId) return;
    const ids = rows.filter((r) => r.mot_correct === motCorrect).map((r) => r.id);
    const { error } = await supabase.from("enfant_lexique").delete().in("id", ids);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.mot_correct !== motCorrect));
    }
  };

  const removeVariant = async (motCorrect: string, variant: string) => {
    const row = rows.find((r) => r.mot_correct === motCorrect && r.mot_transcrit === variant);
    if (!row) return;
    const { error } = await supabase.from("enfant_lexique").delete().eq("id", row.id);
    if (!error) {
      setRows((prev) => prev.filter((r) => r.id !== row.id));
    }
  };

  if (enfantLoading || loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}
      >
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Filter: never show onboarding_prenom entries
  const visibleRows = rows.filter((r) => r.source !== "onboarding_prenom");
  const grouped = groupByMotCorrect(visibleRows);

  // Split into sections
  const structureEntries = Array.from(grouped.entries()).filter(
    ([, { source }]) => source === "onboarding_structure"
  );
  const manualEntries = Array.from(grouped.entries()).filter(
    ([, { source }]) => source === "manual"
  );

  return (
    <div
      className="min-h-screen pb-8"
      style={{
        background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-4 pb-2">
        <div
          className="flex items-center gap-3 rounded-2xl px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.38)",
            backdropFilter: "blur(16px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.85)",
            boxShadow: "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <button
            onClick={() => navigate(-1)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1
            className="text-lg font-semibold text-card-foreground"
            style={{ fontFamily: "Fraunces" }}
          >
            Mon vocabulaire
          </h1>
        </div>
      </div>

      <div className="px-4 space-y-6 mt-4">
        <VoiceBanner />

        {/* Add word input */}
        <div className="flex gap-2">
          <Input
            value={newWord}
            onChange={(e) => setNewWord(e.target.value)}
            placeholder="Ajouter un mot (ex: Motilo)"
            className="flex-1 rounded-xl"
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.85)",
              fontFamily: "DM Sans",
            }}
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
            {addingWord ? (
              <Loader2 className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Plus className="h-4 w-4 text-white" />
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed" style={{ fontFamily: "DM Sans" }}>
          Ajoutez les noms propres, lieux ou termes spécifiques que vous utilisez au quotidien.
          L'IA générera automatiquement des variantes phonétiques pour améliorer la transcription vocale.
        </p>

        {/* Structure section */}
        {structureEntries.length > 0 && (
          <div className="space-y-2">
            <h2
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
              style={{ fontFamily: "DM Sans" }}
            >
              Lieux & structures
            </h2>
            {structureEntries.map(([motCorrect, { entries }]) => (
              <VocabBlock
                key={motCorrect}
                motCorrect={motCorrect}
                variantes={entries.map((e) => e.mot_transcrit)}
                onRemoveBlock={() => removeBlock(motCorrect)}
                onRemoveVariant={(v) => removeVariant(motCorrect, v)}
              />
            ))}
          </div>
        )}

        {/* Manual section */}
        {manualEntries.length > 0 && (
          <div className="space-y-2">
            <h2
              className="text-sm font-semibold text-muted-foreground uppercase tracking-wide"
              style={{ fontFamily: "DM Sans" }}
            >
              Mots ajoutés
            </h2>
            {manualEntries.map(([motCorrect, { entries }]) => (
              <VocabBlock
                key={motCorrect}
                motCorrect={motCorrect}
                variantes={entries.map((e) => e.mot_transcrit)}
                onRemoveBlock={() => removeBlock(motCorrect)}
                onRemoveVariant={(v) => removeVariant(motCorrect, v)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {visibleRows.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>
              Aucun mot dans votre vocabulaire pour l'instant.
            </p>
            <p className="text-xs text-muted-foreground mt-1" style={{ fontFamily: "DM Sans" }}>
              Ajoutez votre premier mot ci-dessus.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Vocabulaire;
