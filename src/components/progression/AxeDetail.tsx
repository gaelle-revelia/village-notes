import { useState, useRef, useEffect } from "react";
import { ChevronLeft, MoreHorizontal, Pencil, Archive } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// ── shared hash ──
function hashToFloat(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

const REF_WIDTH = 300;
const MIN_DIST_LARGE = 28;

interface PlacedCircle {
  id: string;
  cx: number;
  cy: number;
  r: number;
  opacity: number;
  dur: number;
  delay: number;
}

function placeCirclesLarge(
  pepites: { id: string; recency: number }[],
  height: number
): PlacedCircle[] {
  const placed: { cx: number; cy: number; r: number }[] = [];
  const result: PlacedCircle[] = [];

  for (const p of pepites) {
    const r = 5 + p.recency * 7; // 5–12px
    const initCxPct = hashToFloat(p.id, 1) * 90 + 5;
    const initCx = (initCxPct / 100) * REF_WIDTH;
    const initCy = hashToFloat(p.id, 2) * (height - 24) + 12;

    let bestCx = initCx;
    let bestCy = initCy;
    let found = !placed.some(
      (c) => Math.hypot(c.cx - bestCx, c.cy - bestCy) < MIN_DIST_LARGE
    );

    if (!found) {
      for (let attempt = 0; attempt < 80 && !found; attempt++) {
        const angle = (attempt % 24) * 15 * (Math.PI / 180);
        const radius = 10 * (1 + Math.floor(attempt / 24));
        const candidateCx = initCx + Math.cos(angle) * radius;
        const candidateCy = initCy + Math.sin(angle) * radius;
        if (candidateCx < 8 || candidateCx > REF_WIDTH - 8 || candidateCy < 8 || candidateCy > height - 8) continue;
        if (!placed.some((c) => Math.hypot(c.cx - candidateCx, c.cy - candidateCy) < MIN_DIST_LARGE)) {
          bestCx = candidateCx;
          bestCy = candidateCy;
          found = true;
        }
      }
    }

    if (!found) continue;

    placed.push({ cx: bestCx, cy: bestCy, r });
    result.push({
      id: p.id,
      cx: (bestCx / REF_WIDTH) * 100,
      cy: bestCy,
      r,
      opacity: 0.4 + p.recency * 0.45,
      dur: 2.5 + hashToFloat(p.id, 3) * 2.5,
      delay: hashToFloat(p.id, 4) * 1.2,
    });
  }
  return result;
}

// ── types ──
export interface PepiteDetail {
  id: string;
  created_at: string;
  memo_id: string;
  resume: string | null;
  type: string;
}

interface AxeDetailProps {
  axe: { id: string; label: string; couleur: string; ordre: number; description?: string | null };
  pepites: PepiteDetail[];
  prenom: string;
  onBack: () => void;
  onRemovePepite: (pepiteId: string) => void;
  onArchiveAxe: () => void;
  onRenameAxe: (newLabel: string) => void;
  onUpdateDescription?: (desc: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  vocal: "#8B74E0",
  note: "#44A882",
  activite: "#E8736A",
  document: "#8A9BAE",
  evenement: "#E8C84A",
};

const TYPE_BADGES: Record<string, { emoji: string; label: string; color: string }> = {
  vocal: { emoji: "🎙️", label: "Vocal", color: "#8B74E0" },
  note: { emoji: "✏️", label: "Note", color: "#44A882" },
  evenement: { emoji: "⭐", label: "Étape", color: "#E8C84A" },
  document: { emoji: "📄", label: "Document", color: "#8A9BAE" },
  activite: { emoji: "🏃", label: "Activité", color: "#8B74E0" },
};

function getPepiteCardStyle(type: string) {
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
    background: "rgba(255,255,255,0.38)",
    backdropFilter: "blur(16px) saturate(1.6)",
    WebkitBackdropFilter: "blur(16px) saturate(1.6)",
    border: "1px solid rgba(255,255,255,0.85)",
    borderRadius: 16,
    padding: "11px 13px",
    boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
  };
}

const DescTextarea = ({
  descRef,
  value,
  onChange,
  onBlur,
}: {
  descRef: React.RefObject<HTMLTextAreaElement>;
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
}) => {
  useEffect(() => {
    if (descRef.current) {
      descRef.current.style.height = "auto";
      descRef.current.style.height = descRef.current.scrollHeight + "px";
      descRef.current.focus();
    }
  }, []);

  return (
    <textarea
      ref={descRef}
      rows={1}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        if (descRef.current) {
          descRef.current.style.height = "auto";
          descRef.current.style.height = descRef.current.scrollHeight + "px";
        }
      }}
      onBlur={onBlur}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13.5,
        color: "#6B6560",
        lineHeight: 1.6,
        width: "100%",
        border: "none",
        outline: "none",
        background: "rgba(255,255,255,0.5)",
        borderRadius: 8,
        padding: "8px 10px",
        resize: "none",
        overflow: "hidden",
        height: "auto",
      }}
    />
  );
};

const AxeDetail = ({
  axe,
  pepites,
  prenom,
  onBack,
  onRemovePepite,
  onArchiveAxe,
  onRenameAxe,
  onUpdateDescription,
}: AxeDetailProps) => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(axe.label);
  const [selectedPepite, setSelectedPepite] = useState<PepiteDetail | null>(null);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState(axe.description || "");
  const descRef = useRef<HTMLTextAreaElement>(null);

  const now = Date.now();
  const sixMonthsMs = 30 * 24 * 60 * 60 * 1000 * 6;

  const pepitesWithRecency = pepites.map((p) => {
    const age = now - new Date(p.created_at).getTime();
    return { ...p, recency: Math.max(0, 1 - age / sixMonthsMs) };
  });

  const circles = placeCirclesLarge(pepitesWithRecency, 200);
  const sorted = [...pepites].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const handleSaveLabel = async () => {
    const trimmed = labelDraft.trim();
    if (!trimmed || trimmed === axe.label) {
      setEditingLabel(false);
      setLabelDraft(axe.label);
      return;
    }
    const { error } = await supabase
      .from("axes_developpement")
      .update({ label: trimmed })
      .eq("id", axe.id);
    if (error) {
      toast.error("Impossible de renommer l'axe");
    } else {
      onRenameAxe(trimmed);
      toast.success("Axe renommé");
    }
    setEditingLabel(false);
  };

  const handleArchive = async () => {
    const { error } = await supabase
      .from("axes_developpement")
      .update({ actif: false })
      .eq("id", axe.id);
    if (error) {
      toast.error("Impossible d'archiver l'axe");
    } else {
      toast.success("Axe archivé");
      onArchiveAxe();
    }
  };

  const handleRemovePepite = async (pepiteId: string) => {
    const { error } = await supabase.from("pepites").delete().eq("id", pepiteId);
    if (error) {
      toast.error("Impossible de retirer la pépite");
    } else {
      onRemovePepite(pepiteId);
      setSelectedPepite(null);
    }
  };

  const typeColor = (type: string) => TYPE_COLORS[type] || "#9A9490";

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header ── */}
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {/* Back */}
          <button
            onClick={onBack}
            className="flex items-center gap-1 -ml-1"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#8B74E0",
              fontWeight: 500,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <ChevronLeft size={16} color="#8B74E0" />
            {prenom}
          </button>

          {/* Domain badge */}
          <span
            style={{
              display: "inline-block",
              width: "fit-content",
              background: `${axe.couleur}26`,
              color: axe.couleur,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 10,
              textTransform: "uppercase",
              borderRadius: 12,
              padding: "3px 10px",
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            Axe de développement
          </span>

          {/* Title */}
          {editingLabel ? (
            <input
              autoFocus
              value={labelDraft}
              onChange={(e) => setLabelDraft(e.target.value)}
              onBlur={handleSaveLabel}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLabel();
                if (e.key === "Escape") {
                  setEditingLabel(false);
                  setLabelDraft(axe.label);
                }
              }}
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1E1A1A",
                border: "none",
                borderBottom: `2px solid ${axe.couleur}`,
                background: "transparent",
                outline: "none",
                padding: "2px 0",
                width: "100%",
              }}
            />
          ) : (
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: 26,
                fontWeight: 700,
                color: "#1E1A1A",
                lineHeight: 1.2,
              }}
            >
              {axe.label}
            </h2>
          )}

          {/* Count */}
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#9A9490",
            }}
          >
            {pepites.length === 0
              ? "Aucune pépite encore — elles arrivent avec tes notes"
              : `${pepites.length} pépite${pepites.length > 1 ? "s" : ""} dans cet axe`}
          </p>
        </div>

        {/* Options menu */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 6,
            }}
          >
            <MoreHorizontal size={20} color="#9A9490" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-20"
                onClick={() => setMenuOpen(false)}
              />
              <div
                className="absolute right-0 top-8 z-30"
                style={{
                  background: "rgba(255,255,255,0.92)",
                  backdropFilter: "blur(16px)",
                  border: "1px solid rgba(255,255,255,0.85)",
                  borderRadius: 14,
                  boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                  padding: "6px 0",
                  minWidth: 200,
                }}
              >
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setEditingLabel(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "#1E1A1A",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Pencil size={14} color="#9A9490" />
                  Faire évoluer cet axe
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setConfirmArchive(true);
                  }}
                  className="flex items-center gap-3 w-full px-4 py-3"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "#E8736A",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <Archive size={14} color="#E8736A" />
                  Archiver cet axe
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Editable description */}
      <div style={{ padding: "0 4px" }}>
        {editingDesc ? (
          <DescTextarea
            descRef={descRef}
            value={descDraft}
            onChange={(val) => setDescDraft(val)}
            onBlur={async () => {
              setEditingDesc(false);
              const trimmed = descDraft.trim();
              await supabase
                .from("axes_developpement")
                .update({ description: trimmed || null })
                .eq("id", axe.id);
              onUpdateDescription?.(trimmed);
            }}
          />
        ) : (
          <p
            onClick={() => {
              setDescDraft(axe.description || "");
              setEditingDesc(true);
            }}
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: axe.description ? 13.5 : 13,
              color: axe.description ? "#6B6560" : "#C4BFB9",
              fontStyle: axe.description ? "normal" : "italic",
              lineHeight: 1.6,
              cursor: "pointer",
              margin: 0,
            }}
          >
            {axe.description || "Ajoute un contexte à cet axe…"}
          </p>
        )}
      </div>

      {confirmArchive && (
        <div
          style={{
            background: "rgba(232,115,106,0.08)",
            border: "1px solid rgba(232,115,106,0.2)",
            borderRadius: 14,
            padding: "14px 16px",
          }}
        >
          <p
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#1E1A1A",
              marginBottom: 10,
            }}
          >
            Archiver « {axe.label} » ? Les pépites seront conservées.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmArchive(false)}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "#9A9490",
                background: "none",
                border: "1px solid rgba(154,148,144,0.3)",
                borderRadius: 10,
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              Annuler
            </button>
            <button
              onClick={handleArchive}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                color: "#fff",
                background: "#E8736A",
                border: "none",
                borderRadius: 10,
                padding: "6px 14px",
                cursor: "pointer",
              }}
            >
              Archiver
            </button>
          </div>
        </div>
      )}

      {/* ── Large constellation ── */}
      <div
        style={{
          background: "rgba(255,255,255,0.38)",
          backdropFilter: "blur(16px) saturate(1.6)",
          WebkitBackdropFilter: "blur(16px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.85)",
          borderRadius: 18,
          boxShadow:
            "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
          padding: "12px 8px",
        }}
      >
        <svg width="100%" height={200} style={{ display: "block" }}>
          {circles.length > 0 ? (
            circles.map((c) => {
              const baseOp = c.opacity;
              const dimOp = baseOp * 0.4;
              return (
                <circle
                  key={c.id}
                  cx={`${c.cx}%`}
                  cy={c.cy}
                  r={c.r}
                  fill={axe.couleur}
                  style={{
                    opacity: baseOp,
                    animation: `twinkle-lg-${c.id.slice(0, 8)} ${c.dur}s ${c.delay}s ease-in-out infinite`,
                    cursor: "pointer",
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const match = pepites.find((p) => p.id === c.id);
                    if (match) setSelectedPepite(match);
                  }}
                >
                  <style>{`
                    @keyframes twinkle-lg-${c.id.slice(0, 8)} {
                      0% { opacity: ${baseOp}; }
                      50% { opacity: ${dimOp}; }
                      100% { opacity: ${baseOp}; }
                    }
                  `}</style>
                </circle>
              );
            })
          ) : (
            <>
              {[0, 1, 2, 3, 4].map((i) => (
                <circle
                  key={i}
                  cx={`${15 + i * 17}%`}
                  cy={100}
                  r={6}
                  fill="none"
                  stroke={axe.couleur}
                  strokeWidth={1}
                  strokeDasharray="3 2"
                  opacity={0.35}
                />
              ))}
            </>
          )}
        </svg>
      </div>

      {/* ── Pepites list ── */}
      <div className="flex items-center justify-between mt-1">
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            textTransform: "uppercase",
            color: "#9A9490",
            fontWeight: 500,
            letterSpacing: 0.8,
          }}
        >
          TOUTES LES PÉPITES
        </span>
        <span
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 10,
            color: "#9A9490",
          }}
        >
          {pepites.length}
        </span>
      </div>

      <div className="flex flex-col gap-2.5">
        {sorted.map((p) => {
          const badge = TYPE_BADGES[p.type] || TYPE_BADGES.vocal;
          const isActivite = p.type === "activite";
          const isEvenement = p.type === "evenement";
          const rawStr = p.resume || "";

          // Activite: parse "Titre — Duration / Distance"
          let activiteTitre = "";
          let activiteStats: { value: string; label: string }[] = [];
          if (isActivite && rawStr) {
            const parts = rawStr.split(" — ");
            activiteTitre = parts[0];
            const statsRaw = parts[1] || "";
            activiteStats = statsRaw.split(" / ").filter(Boolean).map((s, i) => ({
              value: s.trim(),
              label: i === 0 ? "Durée" : "Distance",
            }));
          }

          return (
            <div
              key={p.id}
              onClick={() => setSelectedPepite(p)}
              className="cursor-pointer transition-transform active:scale-[0.98]"
              style={getPepiteCardStyle(p.type)}
            >
              {/* Meta row: ✦ + badge + date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center" style={{ gap: 7 }}>
                  <span style={{ color: axe.couleur, fontSize: 12, lineHeight: 1 }}>✦</span>
                  <div style={{ width: 1, height: 11, backgroundColor: "rgba(0,0,0,0.1)" }} />
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
                </div>
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#9A9490" }}>
                  {format(new Date(p.created_at), "d MMM yyyy", { locale: fr })}
                </span>
              </div>

              {/* Resume / content */}
              {isActivite && rawStr ? (
                <>
                  <p
                    className="mt-1.5"
                    style={{ fontFamily: "'Fraunces', serif", fontSize: 16, lineHeight: 1.3, color: "#1E1A1A", fontWeight: 700 }}
                  >
                    {activiteTitre}
                  </p>
                  {activiteStats.length > 0 && (
                    <div className="flex items-center gap-2.5 mt-1">
                      {activiteStats.map((s, i) => (
                        <div key={i} className="flex items-center gap-2.5">
                          {i > 0 && <div style={{ width: 1, height: 22, background: "rgba(139,116,224,0.2)" }} />}
                          <div className="flex flex-col items-center">
                            <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 700, color: "#1E1A1A", lineHeight: 1.2 }}>
                              {s.value}
                            </span>
                            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#9A9490", fontWeight: 500 }}>
                              {s.label}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : rawStr ? (
                <p
                  className="line-clamp-2 mt-1.5"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 14,
                    lineHeight: 1.45,
                    color: isEvenement ? "#8A6A00" : "#1E1A1A",
                    fontWeight: isEvenement ? 600 : 400,
                  }}
                >
                  {rawStr}
                </p>
              ) : (
                <p className="line-clamp-2 mt-1.5" style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490", fontStyle: "italic" }}>
                  Sans résumé
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bottom sheet ── */}
      {selectedPepite && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.22)" }}
          onClick={() => setSelectedPepite(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md animate-slide-up"
            style={{
              background: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(20px)",
              borderRadius: "20px 20px 0 0",
              padding: "12px 20px 28px",
              boxShadow: "0 -8px 40px rgba(0,0,0,0.1)",
            }}
          >
            {/* Handle */}
            <div className="flex justify-center mb-4">
              <div
                style={{
                  width: 36,
                  height: 4,
                  borderRadius: 2,
                  background: "rgba(0,0,0,0.12)",
                }}
              />
            </div>

            {/* Type badge */}
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 9,
                textTransform: "uppercase",
                color: typeColor(selectedPepite.type),
                background: `${typeColor(selectedPepite.type)}18`,
                borderRadius: 8,
                padding: "3px 9px",
                fontWeight: 600,
                letterSpacing: 0.4,
                display: "inline-block",
                marginBottom: 12,
              }}
            >
              {selectedPepite.type}
            </span>

            {/* Quote block */}
            <div
              style={{
                background: "rgba(255,255,255,0.5)",
                borderLeft: `3px solid ${axe.couleur}`,
                borderRadius: 10,
                padding: "12px 14px",
                marginBottom: 14,
              }}
            >
              <p
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 15,
                  fontStyle: "italic",
                  color: "#1E1A1A",
                  lineHeight: 1.5,
                }}
              >
                {selectedPepite.resume || "Sans résumé"}
              </p>
            </div>

            {/* Meta */}
            <div className="flex items-center gap-2 mb-5">
              <div
                className="flex items-center justify-center rounded-full"
                style={{
                  width: 22,
                  height: 22,
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                }}
              >
                <span
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                  }}
                >
                  {(prenom || "E")[0].toUpperCase()}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: "#9A9490",
                }}
              >
                {format(new Date(selectedPepite.created_at), "d MMM yyyy", {
                  locale: fr,
                })}
              </span>
            </div>

            {/* CTA */}
            <button
              onClick={() =>
                navigate(`/memo-result/${selectedPepite.memo_id}`)
              }
              className="w-full mb-3"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                color: "#fff",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                border: "none",
                borderRadius: 14,
                padding: "13px 0",
                cursor: "pointer",
              }}
            >
              Voir ce mémo dans la timeline
            </button>

            {/* Remove */}
            <button
              onClick={() => handleRemovePepite(selectedPepite.id)}
              className="w-full"
              style={{
                background: "none",
                color: "#9A9490",
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                border: "none",
                cursor: "pointer",
                padding: "8px 0",
              }}
            >
              Retirer de cet axe
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AxeDetail;
