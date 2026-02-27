import { Check, Loader2 } from "lucide-react";

interface ProcessingViewProps {
  step: number; // 1 = upload, 2 = transcription, 3 = structuration
}

const STEPS = [
  { label: "Envoi de l'audio", icon: "📤" },
  { label: "Transcription en cours", icon: "✍️" },
  { label: "Structuration de la note", icon: "🧠" },
];

export function ProcessingView({ step }: ProcessingViewProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-card-foreground">Traitement en cours</h2>
        <p className="text-sm text-muted-foreground">Un instant, on structure votre note...</p>
      </div>

      <div className="space-y-4">
        {STEPS.map((s, i) => {
          const stepNum = i + 1;
          const isDone = step > stepNum;
          const isCurrent = step === stepNum;

          return (
            <div
              key={i}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : isDone
                  ? "border-border bg-card"
                  : "border-border bg-card opacity-50"
              }`}
            >
              <span className="text-lg">{s.icon}</span>
              <span
                className={`flex-1 text-sm font-medium ${
                  isCurrent ? "text-primary" : "text-card-foreground"
                }`}
              >
                {s.label}
              </span>
              {isDone && <Check className="h-4 w-4 text-primary" />}
              {isCurrent && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}
