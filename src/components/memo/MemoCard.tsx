import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Mic, FileText, File, Flag } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface MemoCardProps {
  memo: {
    id: string;
    created_at: string;
    memo_date?: string;
    type?: string;
    processing_status: string;
    transcription_raw?: string | null;
    content_structured: any;
    intervenant?: { nom: string; specialite: string | null } | null;
  };
}

const TAG_DOMAIN_COLORS: Record<string, string> = {
  moteur: "#6B8CAE",
  motricité: "#6B8CAE",
  sensoriel: "#7C9885",
  cognitif: "#C4A162",
  social: "#9B8DB5",
  administratif: "#A8A0A8",
  langage: "#9B8DB5",
  communication: "#9B8DB5",
  orthophonie: "#6B8CAE",
  alimentation: "#7C9885",
  sommeil: "#C4A162",
  progrès: "#7C9885",
  difficulté: "#C4A162",
  autonomie: "#6B8CAE",
  comportement: "#9B8DB5",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(TAG_DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#A8A0A8";
}

const TYPE_CONFIG: Record<string, { icon: typeof Mic; label: string; emoji: string }> = {
  vocal: { icon: Mic, label: "Mémo vocal", emoji: "🎙" },
  note: { icon: FileText, label: "Note", emoji: "📝" },
  document: { icon: File, label: "Document", emoji: "📄" },
  evenement: { icon: Flag, label: "Événement", emoji: "📌" },
};

export function MemoCard({ memo }: MemoCardProps) {
  const navigate = useNavigate();
  const structured = memo.content_structured as {
    resume?: string;
    details?: string[];
    points_cles?: string[];
    tags?: string[];
    description?: string;
  } | null;

  const isProcessing = memo.processing_status !== "done" && memo.processing_status !== "error";
  const memoType = (memo.type as string) || "vocal";
  const typeConfig = TYPE_CONFIG[memoType] || TYPE_CONFIG.vocal;
  const TypeIcon = typeConfig.icon;

  // Display date: prefer memo_date, fallback to created_at
  const displayDate = memo.memo_date
    ? format(new Date(memo.memo_date), "d MMM yyyy", { locale: fr })
    : format(new Date(memo.created_at), "d MMM yyyy", { locale: fr });

  // Summary text based on type
  let summaryText = structured?.resume || null;
  if (!summaryText && memoType === "evenement") {
    summaryText = memo.transcription_raw || structured?.description || null;
  }
  if (!summaryText && memoType === "note") {
    summaryText = memo.transcription_raw || null;
  }

  const tags = structured?.tags || [];

  const handleClick = () => {
    if (memo.processing_status === "done") {
      navigate(`/memo-result/${memo.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="rounded-xl border border-border bg-card p-4 space-y-2.5 shadow-[0_2px_8px_rgba(42,42,42,0.06)] cursor-pointer hover:shadow-[0_4px_12px_rgba(42,42,42,0.1)] transition-shadow"
    >
      {/* Header: type icon + date + intervenant + status */}
      <div className="flex items-start gap-3">
        {/* Type icon badge */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${getTagColor(memoType === "vocal" ? "moteur" : memoType)}15` }}
        >
          <TypeIcon className="h-4 w-4" style={{ color: "hsl(var(--primary))" }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {typeConfig.label}
            </p>
            {isProcessing && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
            {memo.processing_status === "error" && (
              <span className="text-xs font-medium" style={{ color: "hsl(var(--rouge-enregistrement))" }}>
                Erreur
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {displayDate}
            {memo.intervenant && ` · ${memo.intervenant.nom}`}
          </p>
        </div>
      </div>

      {/* Summary */}
      {summaryText && (
        <p className="text-[15px] text-foreground leading-relaxed line-clamp-2">
          {summaryText}
        </p>
      )}

      {isProcessing && !summaryText && (
        <p className="text-sm text-muted-foreground italic">Traitement en cours...</p>
      )}

      {/* Tags with domain-colored left border */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground bg-card"
              style={{
                borderLeft: `3px solid ${getTagColor(tag)}`,
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
