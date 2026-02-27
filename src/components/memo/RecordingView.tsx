import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { useToast } from "@/hooks/use-toast";
import { Mic, Square, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface RecordingViewProps {
  onComplete: (blob: Blob) => void;
  onSwitchToText: () => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function RecordingView({ onComplete, onSwitchToText }: RecordingViewProps) {
  const { toast } = useToast();
  const { isRecording, elapsedSeconds, audioBlob, permissionDenied, start, stop, reset } =
    useAudioRecorder(() => {
      toast({
        title: "Attention",
        description: "L'enregistrement s'arrêtera dans 1 minute (limite 10 min).",
      });
    });

  // When audioBlob becomes available, pass it up
  useEffect(() => {
    if (audioBlob) {
      onComplete(audioBlob);
    }
  }, [audioBlob, onComplete]);

  if (permissionDenied) {
    return (
      <div className="text-center space-y-4">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
          <Mic className="h-8 w-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold text-card-foreground">Micro non disponible</h2>
        <p className="text-muted-foreground text-sm">
          L'accès au microphone a été refusé. Vous pouvez saisir votre note en texte.
        </p>
        <Button onClick={onSwitchToText} className="rounded-xl">
          <Keyboard className="mr-2 h-4 w-4" />
          Saisir en texte
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Timer */}
      <div className="text-4xl font-mono text-card-foreground tracking-wider">
        {formatTime(elapsedSeconds)}
      </div>

      {/* Pulsating mic button */}
      <div className="relative">
        {isRecording && (
          <>
            <div className="absolute inset-0 rounded-full bg-destructive/20 animate-ping" />
            <div className="absolute -inset-3 rounded-full bg-destructive/10 animate-pulse" />
          </>
        )}
        <button
          onClick={isRecording ? stop : start}
          className={`relative z-10 flex h-24 w-24 items-center justify-center rounded-full transition-all ${
            isRecording
              ? "bg-destructive text-destructive-foreground shadow-lg shadow-destructive/30"
              : "bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:scale-105"
          }`}
        >
          {isRecording ? (
            <Square className="h-8 w-8" fill="currentColor" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
      </div>

      {/* Instructions */}
      <p className="text-sm text-muted-foreground text-center max-w-[250px]">
        {isRecording
          ? "Racontez votre séance... Appuyez sur le bouton pour arrêter."
          : "Appuyez sur le micro pour commencer l'enregistrement"}
      </p>

      {/* Warning near limit */}
      {isRecording && elapsedSeconds >= 540 && (
        <p className="text-xs text-destructive animate-pulse">
          ⚠ L'enregistrement s'arrêtera dans {600 - elapsedSeconds}s
        </p>
      )}

      {/* Text fallback */}
      {!isRecording && (
        <button
          onClick={onSwitchToText}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <Keyboard className="h-3.5 w-3.5" />
          Saisir en texte à la place
        </button>
      )}
    </div>
  );
}
