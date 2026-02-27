import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { Button } from "@/components/ui/button";

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
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
        <div className="animate-pulse" style={{ color: "#8B7D8B" }}>Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!text.trim()) return;
    setProcessingStatus("structuring");

    try {
      // 1. Insert memo with processing_status='structuring'
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

      // 2. Call edge function for AI structuring (text mode)
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-memo", {
        body: {
          memo_id: memo.id,
          mode: "text",
          text_input: text.trim(),
        },
      });

      if (fnError) throw new Error(fnError.message || "Échec du traitement");
      if (fnData?.error) throw new Error(fnData.error);

      // Done → navigate to result
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
        <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: "#F4F1EA" }}>
          <div
            className="w-full max-w-[360px] text-center"
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E3DB",
              borderRadius: 12,
              padding: 32,
            }}
          >
            <div className="text-4xl mb-4">⚠️</div>
            <h2
              style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}
            >
              Une erreur est survenue
            </h2>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B", marginBottom: 24 }}>
              Votre note a bien été enregistrée. Nous réessaierons de la traiter automatiquement.
            </p>
            {errorMessage && (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#8B7D8B", marginBottom: 24 }}>
                {errorMessage}
              </p>
            )}
            <button
              onClick={() => navigate("/timeline")}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: "#6B8CAE",
                cursor: "pointer",
              }}
            >
              Retour à la timeline
            </button>
          </div>
        </div>
      );
    }

    // Structuring state
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4" style={{ backgroundColor: "#F4F1EA" }}>
        <div
          className="w-full max-w-[360px] text-center"
          style={{
            backgroundColor: "#FFFFFF",
            border: "1px solid #E8E3DB",
            borderRadius: 12,
            padding: 32,
          }}
        >
          <div className="text-4xl mb-4 animate-pulse">✨</div>
          <h2
            style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}
          >
            Organisation en cours...
          </h2>
          <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B" }}>
            On structure vos notes automatiquement.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center"
        style={{ backgroundColor: "#F4F1EA" }}
      >
        <button
          onClick={() => navigate("/timeline")}
          className="flex items-center gap-1"
          style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B", background: "none", border: "none" }}
        >
          <ArrowLeft className="h-4 w-4" />
          Retour
        </button>
      </header>

      <main className="flex-1 px-4 pb-32">
        <div className="mx-auto max-w-[400px] space-y-6">
          {/* Title */}
          <h2
            className="text-center"
            style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 24, fontWeight: 600, color: "#2A2A2A" }}
          >
            Nouvelle note
          </h2>

          {/* Date */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E3DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
          </div>

          {/* Intervenant chips */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E3DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "#2A2A2A", display: "block", marginBottom: 8 }}>
              Avec quel intervenant ?
            </label>
            {intervenants.length === 0 ? (
              <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7D8B" }}>
                Aucun intervenant enregistré
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {intervenants.map((i) => {
                  const selected = intervenantId === i.id;
                  return (
                    <button
                      key={i.id}
                      onClick={() => setIntervenantId(selected ? null : i.id)}
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: 13,
                        fontWeight: 500,
                        borderRadius: 8,
                        padding: "8px 14px",
                        border: `1px solid ${selected ? "#6B8CAE" : "#E8E3DB"}`,
                        backgroundColor: selected ? "#6B8CAE" : "#FFFFFF",
                        color: selected ? "#FFFFFF" : "#2A2A2A",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Textarea */}
          <div
            style={{
              backgroundColor: "#FFFFFF",
              border: "1px solid #E8E3DB",
              borderRadius: 12,
              padding: 16,
            }}
          >
            <label style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "#2A2A2A", display: "block", marginBottom: 8 }}>
              Votre note
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Décrivez ce que vous avez observé, entendu ou retenu..."
              rows={5}
              style={{
                width: "100%",
                fontFamily: "Inter, sans-serif",
                fontSize: 15,
                color: "#2A2A2A",
                lineHeight: 1.6,
                border: "none",
                outline: "none",
                resize: "none",
                backgroundColor: "transparent",
              }}
            />
          </div>
        </div>
      </main>

      {/* Fixed save button */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 px-4"
        style={{
          paddingBottom: 24,
          paddingTop: 16,
          backgroundColor: "#F4F1EA",
        }}
      >
        <div className="mx-auto max-w-[400px]">
          <button
            onClick={handleSave}
            disabled={!text.trim() || processingStatus !== "idle"}
            style={{
              width: "100%",
              height: 52,
              borderRadius: 12,
              border: "none",
              fontFamily: "Inter, sans-serif",
              fontSize: 16,
              fontWeight: 600,
              color: "#FFFFFF",
              backgroundColor: !text.trim() ? "#C4BDB8" : "#6B8CAE",
              opacity: processingStatus !== "idle" ? 0.7 : 1,
              cursor: !text.trim() || processingStatus !== "idle" ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
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
