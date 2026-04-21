import { useState, useEffect, useCallback } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Square, Keyboard } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { IntervenantSearchPicker } from "@/components/memo/IntervenantSearchPicker";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ProcessingStatus = "idle" | "uploading" | "transcribing" | "structuring" | "done" | "error";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

const PROCESSING_STEPS: Record<string, { icon: string; title: string; subtitle: string }> = {
  uploading: {
    icon: "⬆️",
    title: "Envoi en cours...",
    subtitle: "Le mémo est en route.",
  },
  transcribing: {
    icon: "🎙",
    title: "Transcription en cours...",
    subtitle: "Transcription en cours...",
  },
  structuring: {
    icon: "✨",
    title: "Organisation en cours...",
    subtitle: "Organisation en cours...",
  },
};

const NouveauMemoVocal = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [textInput, setTextInput] = useState("");
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [freemiumModalOpen, setFreemiumModalOpen] = useState(false);
  const [freemiumChecked, setFreemiumChecked] = useState(false);

  const { isRecording, elapsedSeconds, audioBlob, permissionDenied, start, stop } =
    useAudioRecorder(() => {
      toast({
        title: "Attention",
        description: "L'enregistrement s'arrêtera dans 1 minute (limite 10 min).",
      });
    });

  // (intervenants fetched by IntervenantSearchPicker)

  // Check freemium limit
  useEffect(() => {
    if (!user) return;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    supabase
      .from("memos")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("type", "vocal")
      .gte("created_at", startOfMonth)
      .then(({ count }) => {
        setFreemiumChecked(true);
        if (count !== null && count >= 10) {
          setFreemiumModalOpen(true);
        }
      });
  }, [user]);

  // When audioBlob becomes available, process it
  useEffect(() => {
    if (audioBlob) {
      processMemo(audioBlob);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob]);

  const handleStartRecording = useCallback(async () => {
    if (freemiumModalOpen) return;
    // Re-check freemium
    if (user) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { count } = await supabase
        .from("memos")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("type", "vocal")
        .gte("created_at", startOfMonth);
      if (count !== null && count >= 10) {
        setFreemiumModalOpen(true);
        return;
      }
    }
    start();
  }, [freemiumModalOpen, user, start]);

  const processMemo = async (blob: Blob | null, text?: string) => {
    if (!user) return;
    setProcessingStatus("uploading");

    try {
      // 1. Create memo row
      const { data: memo, error: memoError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          enfant_id: enfantId,
          intervenant_id: intervenantId,
          processing_status: "uploading",
          type: "vocal" as any,
          memo_date: memoDate.toISOString().split("T")[0] as any,
        })
        .select("id")
        .single();

      if (memoError || !memo) throw new Error("Impossible de créer le mémo");

      const isTextMode = !blob && text;

      // 2. Upload audio if voice mode
      if (!isTextMode && blob) {
        const storagePath = `${user.id}/${memo.id}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("audio-temp")
          .upload(storagePath, blob, { contentType: "audio/webm", upsert: true });
        if (uploadError) throw new Error("Échec de l'envoi : " + uploadError.message);
      }

      // 3. Invoke edge function
      setProcessingStatus("transcribing");
      console.info("[vocal-recording] invoke process-memo", {
        hook: "NouveauMemoVocal",
        mode: isTextMode ? "text" : "voice",
        mimeType: blob?.type ?? "unknown",
        blobSizeBytes: blob?.size ?? 0,
        audioPath: isTextMode ? null : `${user.id}/${memo.id}.webm`,
        timestamp: new Date().toISOString(),
      });
      const { data: fnData, error: fnError } = await supabase.functions.invoke("process-memo", {
        body: {
          memo_id: memo.id,
          mode: isTextMode ? "text" : "voice",
          text_input: text || undefined,
        },
      });

      if (fnError) throw new Error(fnError.message || "Échec du traitement");
      if (fnData?.error) throw new Error(fnData.error);

      console.info("[vocal-recording] process-memo success", {
        hook: "NouveauMemoVocal",
        mode: isTextMode ? "text" : "voice",
        timestamp: new Date().toISOString(),
      });

      setProcessingStatus("structuring");
      // Brief delay to show structuring step
      await new Promise((r) => setTimeout(r, 800));

      setProcessingStatus("done");
      navigate(`/memo-result/${memo.id}`);
    } catch (err) {
      const err2 = err as { message?: string; status?: number; context?: { body?: unknown }; body?: unknown };
      console.error("[vocal-recording] process-memo failed", {
        hook: "NouveauMemoVocal",
        mode: isTextMode ? "text" : "voice",
        mimeType: blob?.type ?? "unknown",
        blobSizeBytes: blob?.size ?? 0,
        errorMessage: err2?.message ?? String(err),
        errorStatus: err2?.status ?? null,
        errorBody: err2?.context?.body ?? err2?.body ?? null,
        timestamp: new Date().toISOString(),
      });
      console.error("Process memo error:", err);
      const msg = err instanceof Error ? err.message : "Une erreur est survenue";
      setErrorMessage(msg);
      setProcessingStatus("error");
    }
  };

  const handleTextSubmit = () => {
    if (!textInput.trim()) return;
    processMemo(null, textInput.trim());
  };

  if (authLoading || !freemiumChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;

  // Processing overlay
  if (processingStatus !== "idle") {
    if (processingStatus === "error") {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-[360px] rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.52)", backdropFilter: "blur(16px) saturate(1.6)", WebkitBackdropFilter: "blur(16px) saturate(1.6)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="font-serif text-xl font-semibold text-card-foreground mb-2">
              Une erreur est survenue
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Votre enregistrement a bien été reçu. Nous réessaierons de le traiter automatiquement.
            </p>
            <p className="text-xs text-muted-foreground mb-6">{errorMessage}</p>
            <Button
              onClick={() => navigate("/timeline")}
              className="w-full rounded-xl"
              style={{ backgroundColor: "hsl(var(--primary))" }}
            >
              Retour à la timeline
            </Button>
          </div>
        </div>
      );
    }

    const step = PROCESSING_STEPS[processingStatus];
    if (step) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center px-4">
          <div className="w-full max-w-[360px] rounded-2xl p-8 text-center" style={{ background: "rgba(255,255,255,0.52)", backdropFilter: "blur(16px) saturate(1.6)", WebkitBackdropFilter: "blur(16px) saturate(1.6)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)" }}>
            <div className="text-4xl mb-4 animate-pulse">{step.icon}</div>
            <h2 className="font-serif text-xl font-semibold text-card-foreground mb-2">
              {step.title}
            </h2>
            <p className="text-sm text-muted-foreground">{step.subtitle}</p>
          </div>
        </div>
      );
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/timeline")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Nouveau mémo</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          {/* Date field */}
          <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />

          {/* Intervenant picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Avec quel intervenant ?</label>
            <IntervenantSearchPicker
              enfantId={enfantId}
              value={intervenantId}
              onChange={setIntervenantId}
            />
          </div>

          {/* Voice / Text toggle */}
          {mode === "voice" ? (
            <div className="flex flex-col items-center space-y-4 pt-4">
              {/* Permission denied */}
              {permissionDenied && (
                <div className="rounded-2xl p-4 text-center" style={{ background: "rgba(255,255,255,0.52)", backdropFilter: "blur(16px) saturate(1.6)", WebkitBackdropFilter: "blur(16px) saturate(1.6)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 4px 16px rgba(0,0,0,0.07)" }}>
                  <p className="text-sm text-foreground mb-2">
                    L'accès au microphone est nécessaire pour enregistrer un mémo.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Vérifiez les paramètres de votre appareil.
                  </p>
                </div>
              )}

              {/* Timer */}
              {isRecording && (
                <div className="text-3xl font-mono text-card-foreground tracking-wider">
                  {formatTime(elapsedSeconds)}
                </div>
              )}

              {/* Recording button */}
              <button
                onClick={isRecording ? stop : handleStartRecording}
                className="flex items-center justify-center rounded-full transition-all"
                style={{
                  width: "80px",
                  height: "80px",
                  background: isRecording
                    ? "hsl(var(--rouge-enregistrement))"
                    : "linear-gradient(135deg, #E8736A, #8B74E0)",
                  color: "white",
                  boxShadow: "0 6px 20px rgba(139, 116, 224, 0.4)",
                  animation: isRecording ? "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" : "none",
                }}
              >
                {isRecording ? (
                  <Square className="h-8 w-8" fill="currentColor" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </button>

              {/* Warning near limit */}
              {isRecording && elapsedSeconds >= 540 && (
                <p className="text-xs animate-pulse" style={{ color: "hsl(var(--rouge-enregistrement))" }}>
                  ⚠ L'enregistrement s'arrêtera dans {600 - elapsedSeconds}s
                </p>
              )}

              {/* Text fallback */}
              {!isRecording && (
                <button
                  onClick={() => setMode("text")}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Keyboard className="h-3.5 w-3.5" />
                  ✏️ Saisir en texte à la place
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <Textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Décrivez la séance en quelques mots…"
                className="min-h-[160px] rounded-xl resize-none"
                autoFocus
                autoResize
              />
              <Button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="w-full rounded-xl"
                style={{
                  minHeight: "48px",
                  backgroundColor: "hsl(var(--primary))",
                }}
              >
                Envoyer
              </Button>
              <button
                onClick={() => setMode("voice")}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground flex items-center justify-center gap-1"
              >
                <Mic className="h-3.5 w-3.5" />
                🎙 Enregistrer en vocal à la place
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Freemium Modal */}
      <Dialog open={freemiumModalOpen} onOpenChange={setFreemiumModalOpen}>
        <DialogContent className="max-w-[340px] rounded-xl" hideClose>
          <DialogHeader>
            <DialogTitle className="font-serif text-lg text-center">
              Vous avez utilisé vos 10 notes ce mois-ci
            </DialogTitle>
            <DialogDescription className="text-center text-sm text-muted-foreground">
              Passez en Premium pour continuer à enregistrer sans limite, uploader vos comptes rendus PDF et accéder aux synthèses automatiques.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-2">
            <Button
              className="w-full rounded-xl"
              style={{ backgroundColor: "hsl(var(--primary))" }}
              onClick={() => {
                toast({ title: "Bientôt disponible", description: "L'offre Premium arrive prochainement." });
                setFreemiumModalOpen(false);
              }}
            >
              Passer en Premium — 9,99€/mois
            </Button>
            <Button
              variant="ghost"
              className="w-full rounded-xl text-muted-foreground"
              onClick={() => {
                setFreemiumModalOpen(false);
                navigate("/timeline");
              }}
            >
              Pas maintenant
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NouveauMemoVocal;
