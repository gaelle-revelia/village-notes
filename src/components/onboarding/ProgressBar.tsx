interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground text-center">
        {currentStep} / {totalSteps}
      </p>
      <div className="flex gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              i < currentStep ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
