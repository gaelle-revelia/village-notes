import { useState, useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { RecordingView } from "@/components/memo/RecordingView";
import { ProcessingView } from "@/components/memo/ProcessingView";
import { MemoResultView } from "@/components/memo/MemoResultView";
import { TextInputView } from "@/components/memo/TextInputView";
import { IntervenantPicker } from "@/components/memo/IntervenantPicker";
import { ArrowLeft } from "lucide-react";

type Phase = "pick-intervenant" | "recording" | "text-input" | "processing" | "result" | "error";

interface StructuredContent {
  resume: string;
  points_cles: string[];
  suggestions?: string[];
  a_retenir?: string[];
  tags: string[];
  mode?: string;
  details?: string[];
}

const RecordMemo = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("pick-intervenant");
  const { enfantId } = useEnfantId();
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<{
    transcription: string;
    structured: StructuredContent;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  const processMemo = async (audioBlob: Blob | null, textInput?: string) => {
    setPhase("processing");
    setProcessingStep(1);

    try {
      // Create memo row
      const isTextMode = !audioBlob && textInput;

      const { data: memo, error: memoError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          enfant_id: enfantId,
          intervenant_id: intervenantId,
          processing_status: "pending",
          type: isTextMode ? "note" : "vocal",
          ...(isTextMode ? { transcription_raw: textInput } : {}),
        })
        .select("id")
        .single();

      if (memoError || !memo) throw new Error("Failed to create memo");

      if (!isTextMode && audioBlob) {
        // Upload audio
        const storagePath = `${user.id}/${memo.id}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("audio-temp")
          .upload(storagePath, audioBlob, {
            contentType: "audio/webm",
            upsert: true,
          });

        if (uploadError) throw new Error("Upload failed: " + uploadError.message);
      }

      setProcessingStep(2);

      // Call edge function
      const { data: fnData, error: fnError } = await supabase.functions.invoke(
        "process-memo",
        {
          body: {
            memo_id: memo.id,
            mode: isTextMode ? "text_quick" : "voice",
            text_input: textInput || undefined,
          },
        }
      );

      if (fnError) {
        throw new Error(fnError.message || "Processing failed");
      }

      if (fnData?.error) {
        throw new Error(fnData.error);
      }

      setProcessingStep(3);
      setResult({
        transcription: fnData.transcription,
        structured: fnData.structured,
      });
      setPhase("result");
    } catch (err) {
      console.error("Process memo error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue");
      setPhase("error");
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Une erreur est survenue",
        variant: "destructive",
      });
    }
  };

  const handleRecordingComplete = (audioBlob: Blob) => {
    processMemo(audioBlob);
  };

  const handleTextSubmit = (text: string) => {
    processMemo(null, text);
  };

  const handleBack = () => {
    if (phase === "recording" || phase === "text-input") {
      setPhase("pick-intervenant");
    } else {
      navigate("/timeline");
    }
  };

  return (
    <main className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">
          {phase === "pick-intervenant"
            ? "Nouveau mémo"
            : phase === "recording"
            ? "Enregistrement"
            : phase === "text-input"
            ? "Saisie texte"
            : phase === "processing"
            ? "Traitement..."
            : phase === "result"
            ? "Note structurée"
            : "Erreur"}
        </h1>
      </header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[400px]">
          {phase === "pick-intervenant" && (
            <IntervenantPicker
              enfantId={enfantId}
              onSelect={(id) => {
                setIntervenantId(id);
                setPhase("recording");
              }}
              onSkip={() => setPhase("recording")}
              onTextMode={() => setPhase("text-input")}
            />
          )}

          {phase === "recording" && (
            <RecordingView
              onComplete={handleRecordingComplete}
              onSwitchToText={() => setPhase("text-input")}
            />
          )}

          {phase === "text-input" && (
            <TextInputView
              onSubmit={handleTextSubmit}
              onSwitchToVoice={() => setPhase("recording")}
            />
          )}

          {phase === "processing" && <ProcessingView step={processingStep} />}

          {phase === "result" && result && (
            <MemoResultView
              structured={result.structured}
              transcription={result.transcription}
              onDone={() => navigate("/timeline")}
            />
          )}

          {phase === "error" && (
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">{errorMessage}</p>
              <button
                onClick={() => setPhase("recording")}
                className="rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium"
              >
                Réessayer
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default RecordMemo;
