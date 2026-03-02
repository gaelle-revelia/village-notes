import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";

interface VocabBlockProps {
  motCorrect: string;
  variantes: string[];
  onRemoveVariant?: (variant: string) => void;
  onRemoveBlock?: () => void;
}

export function VocabBlock({ motCorrect, variantes, onRemoveVariant, onRemoveBlock }: VocabBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const MAX_COLLAPSED = 3;
  const displayedVariantes = expanded ? variantes : variantes.slice(0, MAX_COLLAPSED);
  const hasMore = variantes.length > MAX_COLLAPSED;

  return (
    <div
      className="rounded-2xl px-4 py-3 space-y-2"
      style={{
        background: "rgba(255,255,255,0.38)",
        backdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.85)",
        boxShadow: "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-card-foreground" style={{ fontFamily: "DM Sans" }}>
          {motCorrect}
        </span>
        {onRemoveBlock && (
          <button
            onClick={onRemoveBlock}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Supprimer le bloc"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {displayedVariantes.map((v) => (
          <span
            key={v}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs text-muted-foreground"
            style={{
              background: "rgba(139,116,224,0.1)",
              border: "1px solid rgba(139,116,224,0.15)",
              fontFamily: "DM Sans",
            }}
          >
            {v}
            {onRemoveVariant && (
              <button
                onClick={() => onRemoveVariant(v)}
                className="hover:text-destructive ml-0.5"
                aria-label={`Supprimer ${v}`}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </span>
        ))}
      </div>
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Moins" : `+${variantes.length - MAX_COLLAPSED} variantes`}
        </button>
      )}
    </div>
  );
}
