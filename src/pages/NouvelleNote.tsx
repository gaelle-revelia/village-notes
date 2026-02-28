import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { Button } from "@/components/ui/button";

const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
};

const glassHeader: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

type ProcessingStatus = "idle" | "structuring" | "done" | "error";

const NouvelleNote = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [text, setText] = useState("");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .then(({ data }) => {
        if (data) setIntervenants(data);
      });
  }, [enfantId]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!text.trim()) return;
    setProcessingStatus("structuring");

    try {
      const { data: memo, error: memoError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          enfant_id: enfantId,
          intervenant_id: intervenantId,
          transcription_raw: text.trim(),
          content_structured: null,
          processing_status: "structuring",
          type: "note" as any,
          memo_date: memoDate.toISOString().split("T")[0] as any,
        })
        .select("id")
        .single();

      if (memoError || !memo) throw new Error("Impossible de créer la note");

      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-memo", {
        body: {
          memo_id: memo.id,
          mode: "text",
          text_input: text.trim(),
        },
      });

      if (fnError) throw new Error(fnError.message || "Échec du traitement");
      if (fnData?.error) throw new Error(fnData.error);

      setProcessingStatus("done");
      navigate(`/memo-result/${memo.id}`);
    } catch (err) {
      console.error("Process note error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue");
      setProcessingStatus("error");
    }
  };

  // Processing overlay
  if (processingStatus !== "idle") {
    if (processingStatus === "error") {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-[360px] text-center rounded-2xl p-8" style={glassCard}>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Votre note a bien été enregistrée. Nous réessaierons de la traiter automatiquement.
            </p>
            {errorMessage && (
              <p className="text-xs text-muted-foreground mb-6">{errorMessage}</p>
            )}
            <Button onClick={() => navigate("/timeline")} className="w-full rounded-xl h-12 text-base">
              Retour à la timeline
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-[360px] text-center rounded-2xl p-8" style={glassCard}>
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <h2 className="font-serif text-xl font-semibold text-foreground mb-2">
            Organisation en cours...
          </h2>
          <p className="text-sm text-muted-foreground">
            On structure vos notes automatiquement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center" style={glassHeader}>
        <button
          onClick={() => navigate("/timeline")}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </header>

      <main className="flex-1 px-4 pb-32">
        <div className="mx-auto max-w-[400px] space-y-6">
          <h2 className="font-serif text-2xl font-semibold text-foreground text-center">
            Nouvelle note
          </h2>

          <div style={glassCard}>
            <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
          </div>

          <div style={glassCard}>
            <label className="text-sm font-medium text-foreground block mb-2">
              Avec quel intervenant ?
            </label>
            {intervenants.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun intervenant enregistré</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {intervenants.map((i) => {
                  const selected = intervenantId === i.id;
                  return (
                    <button
                      key={i.id}
                      onClick={() => setIntervenantId(selected ? null : i.id)}
                      className="rounded-lg px-3.5 py-2 text-sm font-medium transition-all"
                      style={{
                        border: selected ? "none" : "1px solid rgba(255,255,255,0.72)",
                        background: selected ? "linear-gradient(135deg, #E8736A, #8B74E0)" : "rgba(255,255,255,0.5)",
                        color: selected ? "#FFFFFF" : "hsl(12 8% 11%)",
                      }}
                    >
                      {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={glassCard}>
            <label className="text-sm font-medium text-foreground block mb-2">
              Votre note
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Décrivez ce que vous avez observé, entendu ou retenu..."
              rows={5}
              className="w-full text-[15px] text-foreground leading-relaxed placeholder:text-muted-foreground border-none outline-none resize-none bg-transparent"
            />
          </div>
        </div>
      </main>

      {/* Fixed save button */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-4" style={glassHeader}>
        <div className="mx-auto max-w-[400px]">
          <button
            onClick={handleSave}
            disabled={!text.trim() || processingStatus !== "idle"}
            className="w-full h-[52px] rounded-xl border-none text-base font-semibold text-white cursor-pointer transition-opacity"
            style={{
              background: !text.trim() ? "hsl(var(--muted-foreground))" : "linear-gradient(135deg, #E8736A, #8B74E0)",
              boxShadow: text.trim() ? "0 6px 20px rgba(139,116,224,0.3)" : "none",
              opacity: processingStatus !== "idle" ? 0.7 : 1,
              cursor: !text.trim() || processingStatus !== "idle" ? "not-allowed" : "pointer",
            }}
          >
            Enregistrer la note
          </button>
        </div>
      </div>
    </div>
  );
};

export default NouvelleNote;