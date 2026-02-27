import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface StepNSMProps {
  prenomEnfant: string;
  onNext: (score: number) => void;
}

export function StepNSM({ prenomEnfant, onNext }: StepNSMProps) {
  const [score, setScore] = useState<number | null>(null);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-[32px] font-semibold text-card-foreground">Une dernière question</h1>
        <p className="text-foreground text-lg">
          Aujourd'hui, sur 10, quelle est votre clarté sur les objectifs thérapeutiques de {prenomEnfant} ?
        </p>
        <p className="text-sm text-muted-foreground">
          0 = je ne sais pas du tout / 10 = j'ai une vision très claire
        </p>
      </div>

      <div className="space-y-6">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>0</span>
          <span>5</span>
          <span>10</span>
        </div>
        <Slider
          min={0}
          max={10}
          step={1}
          value={score !== null ? [score] : [5]}
          onValueChange={(v) => setScore(v[0])}
          className="w-full"
        />
        {score !== null && (
          <div className="text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-xl font-semibold">
              {score}
            </span>
          </div>
        )}
      </div>

      <Button
        onClick={() => onNext(score ?? 5)}
        disabled={score === null}
        className="w-full rounded-xl h-12 text-base"
      >
        Continuer
      </Button>
    </div>
  );
}
