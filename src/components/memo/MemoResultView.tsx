import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface StructuredContent {
  resume: string;
  points_cles: string[];
  suggestions?: string[];
  tags: string[];
}

interface MemoResultViewProps {
  structured: StructuredContent;
  transcription: string;
  onDone: () => void;
}

const TAG_COLORS: Record<string, string> = {
  motricité: "bg-blue-100 text-blue-800",
  communication: "bg-purple-100 text-purple-800",
  alimentation: "bg-amber-100 text-amber-800",
  sommeil: "bg-indigo-100 text-indigo-800",
  progrès: "bg-emerald-100 text-emerald-800",
  difficulté: "bg-red-100 text-red-800",
  autonomie: "bg-teal-100 text-teal-800",
  comportement: "bg-orange-100 text-orange-800",
};

function getTagColor(tag: string): string {
  const normalized = tag.toLowerCase();
  for (const [key, value] of Object.entries(TAG_COLORS)) {
    if (normalized.includes(key)) return value;
  }
  return "bg-muted text-muted-foreground";
}

export function MemoResultView({ structured, transcription, onDone }: MemoResultViewProps) {
  return (
    <div className="space-y-6">
      {/* Tags */}
      {structured.tags && structured.tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {structured.tags.map((tag, i) => (
            <span
              key={i}
              className={`rounded-lg px-3 py-1 text-xs font-medium ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Summary */}
      <div className="rounded-xl border bg-card p-4 space-y-2">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Résumé
        </h3>
        <p className="text-card-foreground leading-relaxed">{structured.resume}</p>
      </div>

      {/* Key points */}
      {structured.points_cles && structured.points_cles.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            À retenir
          </h3>
          <ul className="space-y-2">
            {structured.points_cles.map((point, i) => (
              <li key={i} className="flex gap-2 text-card-foreground">
                <span className="text-primary mt-0.5">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Suggestions */}
      {structured.suggestions && structured.suggestions.length > 0 && (
        <div className="rounded-xl border bg-card p-4 space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Pistes évoquées
          </h3>
          <ul className="space-y-2">
            {structured.suggestions.map((s, i) => (
              <li key={i} className="flex gap-2 text-card-foreground">
                <span className="text-accent-foreground mt-0.5">→</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Done button */}
      <Button onClick={onDone} className="w-full rounded-xl h-12 text-base">
        <Check className="mr-2 h-4 w-4" />
        C'est bon
      </Button>
    </div>
  );
}
