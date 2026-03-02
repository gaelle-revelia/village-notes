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
  famille: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  papa: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  maman: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  "grand-parents": { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  parrain: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  marraine: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
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

// --- Type badge config ---
const TYPE_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  vocal: { emoji: "🎙️", label: "Vocal", color: "#8B74E0" },
  note: { emoji: "✏️", label: "Note", color: "#44A882" },
  evenement: { emoji: "⭐", label: "Étape", color: "#E8C84A" },
  document: { emoji: "📄", label: "Document", color: "#8A9BAE" },
  activite: { emoji: "🏃", label: "Activité", color: "#8B74E0" },
};

// --- Card style per type ---
function getCardStyle(type?: string) {
  if (type === "evenement") {
    return {
      background: "rgba(255,248,220,0.55)",
      backdropFilter: "blur(16px) saturate(1.6)",
      WebkitBackdropFilter: "blur(16px) saturate(1.6)",
      border: "1px solid rgba(232,200,74,0.35)",
      borderRadius: 16,
      padding: "11px 13px",
      boxShadow: "0 4px 24px rgba(232,200,74,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
    };
  }
  if (type === "document") {
    return {
      background: "rgba(240,243,247,0.55)",
      backdropFilter: "blur(16px) saturate(1.6)",
      WebkitBackdropFilter: "blur(16px) saturate(1.6)",
      border: "1px solid rgba(138,155,174,0.25)",
      borderRadius: 16,
      padding: "11px 13px",
      boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    };
  }
  if (type === "activite") {
    return {
      background: "rgba(232,239,255,0.45)",
      backdropFilter: "blur(16px) saturate(1.6)",
      WebkitBackdropFilter: "blur(16px) saturate(1.6)",
      border: "1px solid rgba(139,116,224,0.2)",
      borderRadius: 16,
      padding: "11px 13px",
      boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
    };
  }
  return {
    background: "rgba(255, 255, 255, 0.38)",
    backdropFilter: "blur(16px) saturate(1.6)",
    WebkitBackdropFilter: "blur(16px) saturate(1.6)",
    border: "1px solid rgba(255, 255, 255, 0.85)",
    borderRadius: 16,
    padding: "11px 13px",
    boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
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

  const memoType = memo.type || "vocal";
  const isProcessing = memoType !== "document" && memo.processing_status !== "done" && memo.processing_status !== "error";
  const badge = TYPE_BADGES[memoType] || TYPE_BADGES.vocal;

  const displayDate = memo.memo_date
    ? format(new Date(memo.memo_date), "d MMM yyyy", { locale: fr })
    : format(new Date(memo.created_at), "d MMM yyyy", { locale: fr });

  let summaryText = structured?.resume || null;
  if (!summaryText && memoType === "evenement") {
    summaryText = memo.transcription_raw || structured?.description || null;
  }
  if (!summaryText && memoType === "note") {
    summaryText = memo.transcription_raw || null;
  }

  const tags = structured?.tags || [];
  const domainColors = getDomainsFromTags(tags);

  const handleClick = () => {
    if (memo.processing_status === "done" || memoType === "document") {
      navigate(`/memo-result/${memo.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="cursor-pointer transition-shadow"
      style={getCardStyle(memoType)}
    >
      {/* Line 1: card-meta */}
      <div className="flex items-center justify-between">
        {/* LEFT: dots + separator + badge + separator + avatar */}
        <div className="flex items-center" style={{ gap: 7 }}>
          {/* Domain dots first */}
          {domainColors.length > 0 && (
            <>
              <div className="flex items-center gap-1">
                {domainColors.map((color, i) => (
                  <div
                    key={i}
                    style={{
                      width: 7, height: 7, borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                ))}
              </div>
              <div style={{ width: 1, height: 11, backgroundColor: "rgba(0,0,0,0.1)" }} />
            </>
          )}

          {/* Type badge */}
          <span
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 9,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              color: badge.color,
            }}
          >
            {badge.emoji} {badge.label}
          </span>

          {/* Separator before avatar */}
          <div style={{ width: 1, height: 11, backgroundColor: "rgba(0,0,0,0.1)" }} />

          {/* Intervenant avatar + prenom (skip for étape) */}
          {memoType !== "evenement" && memo.intervenant && (() => {
            const { icon: Icon, gradient } = getSpecialiteAvatar(memo.intervenant!.specialite);
            return (
              <>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{
                    width: 20, height: 20, borderRadius: "50%",
                    background: gradient, overflow: "hidden",
                  }}
                >
                  {memo.intervenant!.photo_url ? (
                    <img src={memo.intervenant!.photo_url} alt={memo.intervenant!.nom} className="w-full h-full object-cover" />
                  ) : (
                    <Icon size={10} color="#FFFFFF" />
                  )}
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, fontWeight: 500, color: "#1E1A1A" }}>
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
        <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#9A9490" }}>
          {displayDate}
        </span>
      </div>

      {/* Line 2: resume / title — activite has special parsing */}
      {memoType === "activite" && (structured?.resume || memo.transcription_raw) ? (() => {
        const rawStr = structured?.resume || memo.transcription_raw || "";
        const parts = rawStr.split(" — ");
        const titre = parts[0];
        const statsRaw = parts[1] || "";
        const statParts = statsRaw.split(" / ").filter(Boolean);
        const statItems = statParts.map((s, i) => ({
          value: s.trim(),
          label: i === 0 ? "Durée" : "Distance",
        }));
        return (
          <>
            <p
              className="mt-1.5"
              style={{ fontFamily: "'Fraunces', serif", fontSize: 16, lineHeight: 1.3, color: "#1E1A1A", fontWeight: 700 }}
            >
              {titre}
            </p>
            {statItems.length > 0 && (
              <div className="flex items-center gap-2.5 mt-1">
                {statItems.map((s, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    {i > 0 && <div style={{ width: 1, height: 22, background: "rgba(139,116,224,0.2)" }} />}
                    <div className="flex flex-col items-center">
                      <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1E1A1A", lineHeight: 1.2 }}>
                        {s.value}
                      </span>
                      <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#9A9490", fontWeight: 500, marginTop: 0 }}>
                        {s.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        );
      })() : summaryText ? (
        <p
          className="line-clamp-2 mt-1.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 14,
            lineHeight: 1.45,
            color: memoType === "evenement" ? "#8A6A00" : "#1E1A1A",
            fontWeight: memoType === "evenement" ? 600 : 400,
          }}
        >
          {summaryText}
        </p>
      ) : null}

      {isProcessing && !summaryText && (
        <p className="text-sm text-muted-foreground italic mt-1.5">Traitement en cours...</p>
      )}
    </div>
  );
}
