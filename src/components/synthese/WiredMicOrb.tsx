import { Mic, Loader2 } from "lucide-react";
import { useVocalRecording } from "@/hooks/useVocalRecording";
import { useCallback } from "react";

const formatTime = (s: number) => {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

interface WiredMicOrbProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export default function WiredMicOrb({ onTranscription, disabled }: WiredMicOrbProps) {
  const { isRecording, isTranscribing, error, elapsedSeconds, startRecording, stopRecording } = useVocalRecording();

  const handleTap = useCallback(async () => {
    if (disabled || isTranscribing) return;
    if (isRecording) {
      const text = await stopRecording();
      if (text) onTranscription(text);
    } else {
      await startRecording();
    }
  }, [disabled, isRecording, isTranscribing, startRecording, stopRecording, onTranscription]);

  const isIdle = !isRecording && !isTranscribing;

  return (
    <div className="flex flex-col items-center gap-2 mb-5">
      <button
        onClick={handleTap}
        disabled={disabled || isTranscribing}
        className="flex items-center justify-center relative"
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: isRecording
            ? "0 0 0 8px rgba(139,116,224,0.2), 0 0 24px rgba(139,116,224,0.5)"
            : "0 0 24px rgba(139,116,224,0.4)",
          cursor: disabled || isTranscribing ? "not-allowed" : "pointer",
          opacity: disabled ? 0.4 : 1,
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
      <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>
        {isRecording ? formatTime(elapsedSeconds) : isTranscribing ? "Transcription..." : "Appuie pour parler"}
      </span>
      {error && (
        <span className="text-[12px] font-sans text-center max-w-[240px]" style={{ color: "#E8736A" }}>
          {error}
        </span>
      )}
    </div>
  );
}
