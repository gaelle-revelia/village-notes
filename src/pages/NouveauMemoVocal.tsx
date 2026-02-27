import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { IntervenantSelect } from "@/components/memo/IntervenantSelect";
import { RecordingView } from "@/components/memo/RecordingView";
import { TextInputView } from "@/components/memo/TextInputView";
import { ProcessingView } from "@/components/memo/ProcessingView";
import { MemoResultView } from "@/components/memo/MemoResultView";

type Phase = "form" | "recording" | "text-input" | "processing" | "result" | "error";

interface StructuredContent {
  resume: string;
  points_cles: string[];
  suggestions?: string[];
  tags: string[];
}

const NouveauMemoVocal = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("form");
  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [processingStep, setProcessingStep] = useState(0);
  const [result, setResult] = useState<{ transcription: string; structured: StructuredContent } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const processMemo = async (audioBlob: Blob | null, textInput?: string) => {
    setPhase("processing");
    setProcessingStep(1);
    try {
      const { data: memo, error: memoError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          enfant_id: enfantId,
          intervenant_id: intervenantId,
          processing_status: "pending",
          type: "vocal" as any,
          memo_date: memoDate.toISOString().split("T")[0] as any,
        })
        .select("id")
        .single();

      if (memoError || !memo) throw new Error("Failed to create memo");

      const isTextMode = !audioBlob && textInput;
      if (!isTextMode && audioBlob) {
        const storagePath = `${user.id}/${memo.id}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("voice-memos")
          .upload(storagePath, audioBlob, { contentType: "audio/webm", upsert: true });
        if (uploadError) throw new Error("Upload failed: " + uploadError.message);
      }

      setProcessingStep(2);
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-memo", {
        body: { memo_id: memo.id, mode: isTextMode ? "text" : "voice", text_input: textInput || undefined },
      });
      if (fnError) throw new Error(fnError.message || "Processing failed");
      if (fnData?.error) throw new Error(fnData.error);

      setProcessingStep(3);
      setResult({ transcription: fnData.transcription, structured: fnData.structured });
      setPhase("result");
    } catch (err) {
      console.error("Process memo error:", err);
      setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue");
      setPhase("error");
      toast({ title: "Erreur", description: err instanceof Error ? err.message : "Une erreur est survenue", variant: "destructive" });
    }
  };

  const handleBack = () => {
    if (phase === "recording" || phase === "text-input") setPhase("form");
    else navigate("/timeline");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center gap-3">
        <button onClick={handleBack} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Note vocale</h1>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
        <div className="w-full max-w-[400px]">
          {phase === "form" && (
            <div className="space-y-6">
              <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
              <IntervenantSelect enfantId={enfantId} value={intervenantId} onChange={setIntervenantId} />
              <div className="flex flex-col gap-3 pt-4">
                <button
                  onClick={() => setPhase("recording")}
                  className="w-full rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium"
                >
                  🎙 Enregistrer en vocal
                </button>
                <button
                  onClick={() => setPhase("text-input")}
                  className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  ✏️ Saisir en texte à la place
                </button>
              </div>
            </div>
          )}

          {phase === "recording" && (
            <RecordingView onComplete={(blob) => processMemo(blob)} onSwitchToText={() => setPhase("text-input")} />
          )}

          {phase === "text-input" && (
            <TextInputView onSubmit={(text) => processMemo(null, text)} onSwitchToVoice={() => setPhase("recording")} />
          )}

          {phase === "processing" && <ProcessingView step={processingStep} />}

          {phase === "result" && result && (
            <MemoResultView structured={result.structured} transcription={result.transcription} onDone={() => navigate("/timeline")} />
          )}

          {phase === "error" && (
            <div className="text-center space-y-4">
              <p className="text-destructive font-medium">{errorMessage}</p>
              <button onClick={() => setPhase("form")} className="rounded-xl bg-primary px-6 py-3 text-primary-foreground font-medium">
                Réessayer
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NouveauMemoVocal;
