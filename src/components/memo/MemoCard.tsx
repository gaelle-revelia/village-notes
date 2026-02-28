import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, Activity, Hand, Brain, Stethoscope, MessageCircle, User, Heart, Waves } from "lucide-react";
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
    intervenant?: { nom: string; specialite: string | null; photo_url?: string | null } | null;
  };
}

// --- Domain color system (Knowledge File) ---
const DOMAIN_COLORS: Record<string, string> = {
  moteur: "#E8736A",
  motricité: "#E8736A",
  kinésithérapie: "#E8736A",
  physique: "#E8736A",
  cognitif: "#8B74E0",
  psychomotricité: "#8B74E0",
  psychomoteur: "#8B74E0",
  sensoriel: "#44A882",
  communication: "#44A882",
  langage: "#44A882",
  orthophonie: "#44A882",
  "bien-être": "#E8A44A",
  émotionnel: "#E8A44A",
  sommeil: "#E8A44A",
  alimentation: "#E8A44A",
  comportement: "#E8A44A",
  médical: "#8A9BAE",
  administratif: "#8A9BAE",
  progrès: "#44A882",
  difficulté: "#E8A44A",
  autonomie: "#8B74E0",
  social: "#8B74E0",
};

function getDomainColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#8A9BAE";
}

function getDomainsFromTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const tag of tags) {
    const c = getDomainColor(tag);
    if (!seen.has(c)) {
      seen.add(c);
      colors.push(c);
    }
    if (colors.length >= 3) break;
  }
  return colors;
}

// --- Intervenant avatar system ---
const SPECIALITE_AVATARS: Record<string, { icon: typeof Activity; gradient: string }> = {
  kiné: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  kinésithérapeute: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  psychomotric: { icon: Brain, gradient: "linear-gradient(135deg, #8B74E0, #5CA8D8)" },
  ergothérapeute: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  ergo: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  parent: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  médecin: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  mpr: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  orthophoniste: { icon: MessageCircle, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  piscine: { icon: Waves, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
};

function getSpecialiteAvatar(specialite: string | null): { icon: typeof Activity; gradient: string } {
  const s = (specialite || "").toLowerCase();
  for (const [key, val] of Object.entries(SPECIALITE_AVATARS)) {
    if (s.includes(key)) return val;
  }
  return { icon: User, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" };
}

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

  const displayDate = memo.memo_date
    ? format(new Date(memo.memo_date), "d MMM yyyy", { locale: fr })
    : format(new Date(memo.created_at), "d MMM yyyy", { locale: fr });

  let summaryText = structured?.resume || null;
  if (!summaryText && memo.type === "evenement") {
    summaryText = memo.transcription_raw || structured?.description || null;
  }
  if (!summaryText && memo.type === "note") {
    summaryText = memo.transcription_raw || null;
  }

  const tags = structured?.tags || [];
  const domainColors = getDomainsFromTags(tags);

  const handleClick = () => {
    if (memo.processing_status === "done") {
      navigate(`/memo-result/${memo.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer transition-shadow space-y-2"
      style={{
        background: "rgba(255, 255, 255, 0.52)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255, 255, 255, 0.72)",
        borderRadius: 16,
        padding: "16px 20px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {/* Header: domain dots + date + intervenant avatar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Domain dots */}
          <div className="flex items-center gap-1">
            {domainColors.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            ))}
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            {displayDate}
          </p>
          {isProcessing && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
          {memo.processing_status === "error" && (
            <span className="text-xs font-medium text-destructive">Erreur</span>
          )}
        </div>

        {memo.intervenant && (() => {
          const { icon: Icon, gradient } = getSpecialiteAvatar(memo.intervenant!.specialite);
          return (
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {memo.intervenant!.nom}
              </span>
              <div
                className="flex items-center justify-center shrink-0"
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  background: gradient,
                  overflow: "hidden",
                }}
                title={memo.intervenant!.nom}
              >
                {memo.intervenant!.photo_url ? (
                  <img
                    src={memo.intervenant!.photo_url}
                    alt={memo.intervenant!.nom}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon size={12} color="#FFFFFF" />
                )}
              </div>
            </div>
          );
        })()}
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

      {/* No text tags — domain dots are the visual encoding */}
    </div>
  );
}
