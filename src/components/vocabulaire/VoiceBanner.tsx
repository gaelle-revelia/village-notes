import { Mic } from "lucide-react";

export function VoiceBanner() {
  return (
    <div
      className="rounded-2xl px-4 py-3 space-y-2"
      style={{
        background: "rgba(232, 239, 255, 0.45)",
        border: "1px solid rgba(139, 116, 224, 0.2)",
      }}
    >
      <p
        className="text-xs font-semibold text-card-foreground"
        style={{ fontFamily: "DM Sans" }}
      >
        Ces mots sont automatiquement corrigés dans vos notes vocales.
      </p>
      <div className="flex items-start gap-2">
        <span className="text-sm shrink-0">🎙️</span>
        <p className="text-xs leading-relaxed text-muted-foreground" style={{ fontFamily: "DM Sans" }}>
          Correction silencieuse. Quand vous parlez, The Village reconnaît ces mots et les retranscrit fidèlement.
        </p>
      </div>
    </div>
  );
}
