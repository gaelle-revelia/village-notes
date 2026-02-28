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

export function getDomainColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#8A9BAE";
}

export function getDomainsFromTags(tags: string[]): string[] {
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
      className="cursor-pointer transition-shadow"
      style={{
        background: "rgba(255, 255, 255, 0.38)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255, 255, 255, 0.85)",
        borderRadius: 16,
        padding: "11px 13px",
        boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Line 1: card-meta */}
      <div className="flex items-center justify-between">
        {/* LEFT: dots + separator + avatar + prenom */}
        <div className="flex items-center" style={{ gap: 7 }}>
          {/* Domain dots */}
          <div className="flex items-center gap-1">
            {domainColors.map((color, i) => (
              <div
                key={i}
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  backgroundColor: color,
                }}
              />
            ))}
          </div>

          {/* Separator */}
          <div
            style={{
              width: 1,
              height: 11,
              backgroundColor: "rgba(0,0,0,0.1)",
            }}
          />

          {/* Intervenant avatar + prenom */}
          {memo.intervenant && (() => {
            const { icon: Icon, gradient } = getSpecialiteAvatar(memo.intervenant!.specialite);
            return (
              <>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: gradient,
                    overflow: "hidden",
                  }}
                >
                  {memo.intervenant!.photo_url ? (
                    <img
                      src={memo.intervenant!.photo_url}
                      alt={memo.intervenant!.nom}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Icon size={10} color="#FFFFFF" />
                  )}
                </div>
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    fontWeight: 500,
                    color: "#1E1A1A",
                  }}
                >
                  {memo.intervenant!.nom}
                </span>
              </>
            );
          })()}

          {isProcessing && <Loader2 className="h-3.5 w-3.5 text-muted-foreground animate-spin" />}
          {memo.processing_status === "error" && (
            <span className="text-xs font-medium text-destructive">Erreur</span>
          )}
        </div>

        {/* RIGHT: date */}
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            color: "#9A9490",
          }}
        >
          {displayDate}
        </span>
      </div>

      {/* Line 2: resume */}
      {summaryText && (
        <p
          className="line-clamp-2 mt-1.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 12.5,
            lineHeight: 1.45,
            color: "#1E1A1A",
          }}
        >
          {summaryText}
        </p>
      )}

      {isProcessing && !summaryText && (
        <p className="text-sm text-muted-foreground italic mt-1.5">Traitement en cours...</p>
      )}
    </div>
  );
}
