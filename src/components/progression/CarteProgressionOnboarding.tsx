import { useState, useRef, useEffect } from "react";
import { Mic, Square, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useVocalRecording } from "@/hooks/useVocalRecording";
import { toast } from "sonner";

interface Axe {
  label: string;
  couleur: string;
}

interface Props {
  enfantId: string;
  prenom: string;
  onComplete: () => void;
}

const STEPS = [
  {
    title: (p: string) => `Sur quoi ${p} travaille en ce moment ?`,
    subtitle: "Ce qui occupe vraiment votre quotidien",
  },
  {
    title: (p: string) => `Qu'est-ce que vous observez en ce moment chez ${p} ?`,
    subtitle: "Même de petit, même de discret.",
  },
  {
    title: (_p: string) => "S'il ne devait y avoir qu'une chose sur laquelle garder le cap ?",
    subtitle: "L'essentiel, dans vos mots.",
  },
];

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex gap-2 justify-center pt-6 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full transition-all duration-300"
          style={{
            background: i <= current ? "linear-gradient(135deg, #E8736A, #8B74E0)" : "rgba(154,148,144,0.3)",
            transform: i === current ? "scale(1.3)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

function MicButton({
  isRecording,
  isTranscribing,
  elapsedSeconds,
  onStart,
  onStop,
}: {
  isRecording: boolean;
  isTranscribing: boolean;
  elapsedSeconds: number;
  onStart: () => void;
  onStop: () => void;
}) {
  const mm = String(Math.floor(elapsedSeconds / 60)).padStart(2, "0");
  const ss = String(elapsedSeconds % 60).padStart(2, "0");

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={isTranscribing}
        onClick={isRecording ? onStop : onStart}
        className="w-12 h-12 rounded-full flex items-center justify-center text-white transition-all"
        style={{
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: isRecording
            ? "0 0 20px rgba(139,116,224,0.5)"
            : "0 4px 12px rgba(139,116,224,0.3)",
          opacity: isTranscribing ? 0.5 : 1,
        }}
      >
        {isRecording ? <Square size={18} /> : <Mic size={18} />}
      </button>
      {isRecording && (
        <span className="font-sans text-xs" style={{ color: "#9A9490" }}>
          {mm}:{ss}
        </span>
      )}
      {isTranscribing && (
        <span className="font-sans text-xs" style={{ color: "#9A9490" }}>
          Transcription…
        </span>
      )}
    </div>
  );
}

function PulsingDots() {
  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span className="font-sans text-[13px]" style={{ color: "#9A9490" }}>
        Je lis tes réponses…
      </span>
    </div>
  );
}

export default function CarteProgressionOnboarding({ enfantId, prenom, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [responses, setResponses] = useState(["", "", ""]);
  const [generating, setGenerating] = useState(false);
  const [axes, setAxes] = useState<Axe[]>([]);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const vocal = useVocalRecording();

  const updateResponse = (idx: number, val: string) => {
    setResponses((prev) => {
      const next = [...prev];
      next[idx] = val;
      return next;
    });
  };

  const handleMicStop = async (idx: number) => {
    const text = await vocal.stopRecording();
    if (text) {
      updateResponse(idx, (responses[idx] ? responses[idx] + " " : "") + text);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-axes", {
        body: {
          enfant_id: enfantId,
          prenom_enfant: prenom,
          reponse_1: responses[0],
          reponse_2: responses[1],
          reponse_3: responses[2],
        },
      });
      if (error) throw error;
      if (!data?.axes || data.axes.length !== 3) throw new Error("Invalid response");
      setAxes(data.axes);
      setStep(3);
    } catch (err) {
      console.error("generate-axes error:", err);
      toast.error("Erreur lors de la génération. Réessaie.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const rows = axes.map((axe, i) => ({
        enfant_id: enfantId,
        label: axe.label,
        couleur: axe.couleur,
        ordre: i,
        actif: true,
      }));

      const { data: inserted, error } = await supabase
        .from("axes_developpement")
        .insert(rows)
        .select("id, label");

      if (error) throw error;

      // Call backfill-pepites in background — don't block
      supabase.functions
        .invoke("backfill-pepites", {
          body: {
            enfant_id: enfantId,
            axes: (inserted || []).map((a: any) => ({ id: a.id, label: a.label })),
          },
        })
        .catch((err) => console.error("backfill-pepites error (non-blocking):", err));

      onComplete();
    } catch (err) {
      console.error("Save axes error:", err);
      toast.error("Erreur lors de la sauvegarde.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (editingIdx !== null && inputRefs.current[editingIdx]) {
      inputRefs.current[editingIdx]?.focus();
    }
  }, [editingIdx]);

  // Steps 0-2: questions
  if (step < 3) {
    const s = STEPS[step];
    const isLast = step === 2;

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col animate-fade-in"
        style={{
          background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)",
        }}
      >
        <StepDots current={step} total={4} />

        <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
          <h1 className="font-serif font-bold text-[22px] text-foreground leading-snug">
            {s.title(prenom)}
          </h1>
          <p className="font-sans text-[12.5px] mt-1.5 mb-6" style={{ color: "#9A9490" }}>
            {s.subtitle}
          </p>

          <textarea
            rows={4}
            value={responses[step]}
            onChange={(e) => updateResponse(step, e.target.value)}
            className="w-full rounded-2xl p-4 font-sans text-sm text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            style={{
              background: "rgba(255,255,255,0.38)",
              backdropFilter: "blur(16px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.85)",
            }}
            placeholder="Écris ici ou utilise le micro…"
          />

          <div className="flex justify-center mt-4">
            <MicButton
              isRecording={vocal.isRecording}
              isTranscribing={vocal.isTranscribing}
              elapsedSeconds={vocal.elapsedSeconds}
              onStart={() => vocal.startRecording()}
              onStop={() => handleMicStop(step)}
            />
          </div>

          {vocal.error && (
            <p className="text-xs text-red-500 font-sans text-center mt-2">{vocal.error}</p>
          )}

          <div className="flex-1" />

          {generating ? (
            <PulsingDots />
          ) : (
            <button
              disabled={!responses[step].trim()}
              onClick={isLast ? handleGenerate : () => setStep(step + 1)}
              className="w-full py-3.5 rounded-2xl font-sans font-medium text-white text-[15px] transition-opacity disabled:opacity-40"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              }}
            >
              {isLast ? "Générer ma carte →" : "Suivant →"}
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step 3: validation
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{
        background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)",
      }}
    >
      <StepDots current={3} total={4} />

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
        <h1 className="font-serif font-bold text-[22px] text-foreground leading-snug">
          Voici la carte de {prenom}
        </h1>
        <p className="font-sans text-[12.5px] mt-1.5 mb-6" style={{ color: "#9A9490" }}>
          Tape sur un axe pour modifier son label.
        </p>

        <div className="flex flex-col gap-3">
          {axes.map((axe, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl cursor-pointer"
              style={{
                background: "rgba(255,255,255,0.38)",
                backdropFilter: "blur(16px) saturate(1.6)",
                border: "1px solid rgba(255,255,255,0.85)",
                borderLeft: `3px solid ${axe.couleur}`,
                boxShadow:
                  "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
              }}
              onClick={() => setEditingIdx(i)}
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ background: axe.couleur }}
              />
              {editingIdx === i ? (
                <input
                  ref={(el) => { inputRefs.current[i] = el; }}
                  className="flex-1 bg-transparent font-serif text-[15px] text-foreground focus:outline-none"
                  value={axe.label}
                  onChange={(e) => {
                    const newAxes = [...axes];
                    newAxes[i] = { ...newAxes[i], label: e.target.value };
                    setAxes(newAxes);
                  }}
                  onBlur={() => setEditingIdx(null)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") setEditingIdx(null);
                  }}
                />
              ) : (
                <span className="flex-1 font-serif text-[15px] text-foreground">
                  {axe.label}
                </span>
              )}
              <Pencil size={14} style={{ color: "#9A9490" }} className="shrink-0" />
            </div>
          ))}
        </div>

        <p
          className="font-sans text-[11px] text-center mt-4"
          style={{ color: "#9A9490" }}
        >
          Ces axes sont dans tes mots. Tu pourras les faire évoluer quand tu veux.
        </p>

        <div className="flex-1" />

        <button
          disabled={saving || axes.some((a) => !a.label.trim())}
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl font-sans font-medium text-white text-[15px] transition-opacity disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          }}
        >
          {saving ? "Sauvegarde…" : "C'est ma carte ✦"}
        </button>
      </div>
    </div>
  );
}
