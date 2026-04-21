import { Mic, Loader2, WifiOff } from "lucide-react";
import { useVocalRecording } from "@/hooks/useVocalRecording";
import { useCallback } from "react";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

interface WiredMicOrbProps {
  onTranscription: (text: string) => void;
  onRecordingChange?: (recording: boolean) => void;
  disabled?: boolean;
  childId?: string;
}

export default function WiredMicOrb({ onTranscription, onRecordingChange, disabled, childId }: WiredMicOrbProps) {
  const {
    isRecording,
    isTranscribing,
    error,
    elapsedSeconds,
    startRecording,
    stopRecording,
    retry,
    cancelPendingRetry,
    canRetry,
    retryAttempt,
  } = useVocalRecording("clean_transcription", childId);

  const handleTap = useCallback(async () => {
    if (disabled || isTranscribing || canRetry) return;
    if (isRecording) {
      onRecordingChange?.(false);
      const text = await stopRecording();
      if (text) onTranscription(text);
    } else {
      await startRecording();
      onRecordingChange?.(true);
    }
  }, [disabled, isRecording, isTranscribing, canRetry, startRecording, stopRecording, onTranscription, onRecordingChange]);

  const handleRetryClick = useCallback(async () => {
    const text = await retry();
    if (text) onTranscription(text);
  }, [retry, onTranscription]);

  const orbDimmed = canRetry;
  const orbDisabled = disabled || isTranscribing || canRetry;

  // Main label (hidden when canRetry — error block takes the place)
  let mainLabel: string | null = null;
  if (!canRetry) {
    if (isRecording) mainLabel = formatTime(elapsedSeconds);
    else if (isTranscribing && retryAttempt === 0) mainLabel = "Envoi en cours…";
    else if (isTranscribing && retryAttempt >= 1) mainLabel = "On vérifie la connexion…";
    else mainLabel = "Appuyez pour parler";
  }

  return (
    <div className="flex flex-col items-center gap-2 mb-5">
      <button
        onClick={handleTap}
        disabled={orbDisabled}
        className="flex items-center justify-center relative"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: isRecording
            ? "0 0 0 8px rgba(139,116,224,0.2), 0 0 24px rgba(139,116,224,0.5)"
            : "0 0 24px rgba(139,116,224,0.4)",
          cursor: orbDisabled ? "not-allowed" : "pointer",
          opacity: orbDimmed ? 0.55 : disabled ? 0.4 : 1,
          pointerEvents: canRetry ? "none" : "auto",
          transition: "box-shadow 0.3s, opacity 0.2s",
          animation: isRecording ? "pulse 1.5s ease-in-out infinite" : "none",
        }}
      >
        {isTranscribing ? (
          <Loader2 size={30} color="#fff" className="animate-spin" />
        ) : (
          <Mic size={30} color="#fff" />
        )}
      </button>

      {mainLabel && (
        <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>
          {mainLabel}
        </span>
      )}

      {isTranscribing && retryAttempt >= 1 && (
        <span
          className="text-[11px] font-sans mt-0.5"
          style={{ color: "#9A9490", opacity: 0.75 }}
        >
          L'enregistrement est bien là.
        </span>
      )}

      {canRetry ? (
        <div
          className="mt-2 w-full max-w-[300px] rounded-2xl p-4 text-center"
          style={{
            background: "rgba(255,255,255,0.52)",
            backdropFilter: "blur(16px) saturate(1.6)",
            WebkitBackdropFilter: "blur(16px) saturate(1.6)",
            border: "1px solid rgba(255,255,255,0.72)",
            boxShadow:
              "0 4px 16px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.8)",
          }}
        >
          <WifiOff size={22} className="mx-auto mb-2" style={{ color: "#8A9BAE" }} />
          <p
            className="font-serif text-[15px] font-semibold mb-1"
            style={{ color: "#1E1A1A" }}
          >
            Connexion instable
          </p>
          <p className="text-[12px] mb-3" style={{ color: "#9A9490" }}>
            Rien n'est perdu. L'enregistrement peut être renvoyé dès que la connexion est bonne.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={cancelPendingRetry}
              className="text-[12px] px-3 py-2 rounded-xl"
              style={{ background: "rgba(255,255,255,0.6)", color: "#1E1A1A" }}
            >
              Annuler
            </button>
            <button
              onClick={handleRetryClick}
              className="text-[12px] px-3 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
            >
              Renvoyer le mémo
            </button>
          </div>
        </div>
      ) : error ? (
        <span
          className="text-[12px] font-sans text-center max-w-[240px]"
          style={{ color: "#E8736A" }}
        >
          {error}
        </span>
      ) : null}
    </div>
  );
}
