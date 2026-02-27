import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2 } from "lucide-react";

interface MemoCardProps {
  memo: {
    id: string;
    created_at: string;
    processing_status: string;
    content_structured: any;
    intervenant?: { nom: string; specialite: string | null } | null;
  };
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

export function MemoCard({ memo }: MemoCardProps) {
  const structured = memo.content_structured as {
    resume?: string;
    tags?: string[];
  } | null;

  const isProcessing = memo.processing_status !== "done" && memo.processing_status !== "error";

  return (
    <div className="rounded-xl border bg-card p-4 space-y-2">
      {/* Header: date + intervenant */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            {format(new Date(memo.created_at), "d MMM yyyy · HH:mm", { locale: fr })}
          </p>
          {memo.intervenant && (
            <p className="text-xs text-muted-foreground">
              {memo.intervenant.nom}
              {memo.intervenant.specialite && ` · ${memo.intervenant.specialite}`}
            </p>
          )}
        </div>
        {isProcessing && <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />}
        {memo.processing_status === "error" && (
          <span className="text-xs text-destructive">Erreur</span>
        )}
      </div>

      {/* Summary */}
      {structured?.resume && (
        <p className="text-sm text-card-foreground line-clamp-2">{structured.resume}</p>
      )}

      {isProcessing && !structured?.resume && (
        <p className="text-sm text-muted-foreground italic">Traitement en cours...</p>
      )}

      {/* Tags */}
      {structured?.tags && structured.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {structured.tags.map((tag, i) => (
            <span
              key={i}
              className={`rounded-md px-2 py-0.5 text-xs font-medium ${getTagColor(tag)}`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
