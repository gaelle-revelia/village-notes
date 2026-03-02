import { Mic } from "lucide-react";

export function VoiceBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl px-4 py-3"
      style={{
        background: "rgba(232, 239, 255, 0.45)",
        border: "1px solid rgba(139, 116, 224, 0.2)",
      }}
    >
      <div
        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
        style={{ background: "linear-gradient(135deg, #8B74E0, #5CA8D8)" }}
      >
        <Mic className="h-4 w-4 text-white" />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground" style={{ fontFamily: "DM Sans" }}>
        Ces mots aident l'app à mieux comprendre vos notes vocales. Plus le
        vocabulaire est riche, plus la transcription sera fidèle.
      </p>
    </div>
  );
}
