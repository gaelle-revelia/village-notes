import { useState, useEffect, useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, ChevronRight, X, Activity, Hand, Brain, Stethoscope, MessageCircle, User, Waves } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Memo {
  id: string;
  created_at: string;
  memo_date?: string;
  type?: string;
  processing_status: string;
  transcription_raw: string | null;
  content_structured: any;
  intervenant_id: string | null;
  intervenant?: { nom: string; specialite: string | null; photo_url?: string | null } | null;
}

function getSpecialiteAvatar(specialite: string | null): { icon: typeof Activity; bg: string } {
  const s = (specialite || "").toLowerCase();
  if (s.includes("kinésithérapeute") || s.includes("kiné")) return { icon: Activity, bg: "#6B8CAE" };
  if (s.includes("ergothérapeute") || s.includes("ergo")) return { icon: Hand, bg: "#7C9885" };
  if (s.includes("psychomotric")) return { icon: Brain, bg: "#9B8DB5" };
  if (s.includes("médecin") || s.includes("mpr")) return { icon: Stethoscope, bg: "#C4A162" };
  if (s.includes("orthophoniste")) return { icon: MessageCircle, bg: "#7C9885" };
  if (s.includes("piscine") || s.includes("parent")) return { icon: Waves, bg: "#6B8CAE" };
  return { icon: User, bg: "#A8A0A8" };
}

const TAG_COLORS: Record<string, string> = {
  moteur: "#6B8CAE",
  motricité: "#6B8CAE",
  kinésithérapie: "#6B8CAE",
  psychomotricité: "#6B8CAE",
  sensoriel: "#7C9885",
  cognitif: "#C4A162",
  social: "#9B8DB5",
  administratif: "#A8A0A8",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(TAG_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#A8A0A8";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const Timeline = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);

  const menuItems = [
    { icon: "🎙️", label: "Note vocale", description: "Enregistrer une séance à la voix", route: "/nouveau-memo-vocal" },
    { icon: "📝", label: "Note écrite", description: "Ajouter une observation ou une pensée", route: "/nouvelle-note" },
    { icon: "📄", label: "Document", description: "Importer un compte rendu ou une photo", route: "/nouveau-document" },
    { icon: "📌", label: "Événement", description: "Noter un fait marquant", route: "/nouvel-evenement" },
  ];

  useEffect(() => {
    if (!user) return;

    const fetchMemos = async () => {
      const { data } = await supabase
        .from("memos")
        .select("id, created_at, memo_date, type, processing_status, transcription_raw, content_structured, intervenant_id")
        .eq("user_id", user.id)
        .order("memo_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (data && data.length > 0) {
        const intervenantIds = [...new Set(data.filter(m => m.intervenant_id).map(m => m.intervenant_id!))];
        let intervenantsMap: Record<string, { nom: string; specialite: string | null; photo_url: string | null }> = {};

        if (intervenantIds.length > 0) {
          const { data: intervenants } = await supabase
            .from("intervenants")
            .select("id, nom, specialite, photo_url")
            .in("id", intervenantIds);

          if (intervenants) {
            intervenantsMap = Object.fromEntries(intervenants.map(i => [i.id, { nom: i.nom, specialite: i.specialite, photo_url: (i as any).photo_url || null }]));
          }
        }

        setMemos(data.map(m => ({
          ...m,
          intervenant: m.intervenant_id ? intervenantsMap[m.intervenant_id] || null : null,
        })));
      }
      setLoadingMemos(false);
    };

    fetchMemos();
  }, [user]);

  const filteredMemos = useMemo(() => {
    if (!searchQuery.trim()) return memos;
    const q = searchQuery.toLowerCase();
    return memos.filter(m => {
      const structured = m.content_structured as any;
      return (
        m.transcription_raw?.toLowerCase().includes(q) ||
        structured?.resume?.toLowerCase().includes(q) ||
        structured?.details?.some((d: string) => d.toLowerCase().includes(q)) ||
        structured?.tags?.some((t: string) => t.toLowerCase().includes(q)) ||
        m.intervenant?.nom.toLowerCase().includes(q) ||
        m.type?.toLowerCase().includes(q)
      );
    });
  }, [memos, searchQuery]);

  // Group memos by month
  const grouped = useMemo(() => {
    const groups: { key: string; label: string; memos: Memo[] }[] = [];
    const map = new Map<string, Memo[]>();

    for (const memo of filteredMemos) {
      const d = new Date(memo.memo_date || memo.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(memo);
    }

    for (const [key, items] of map) {
      const [y, m] = key.split("-");
      const d = new Date(Number(y), Number(m), 1);
      const label = format(d, "MMMM yyyy", { locale: fr }).toUpperCase();
      groups.push({ key, label, memos: items });
    }

    return groups;
  }, [filteredMemos]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
        <div className="animate-pulse" style={{ color: "#8B7D8B" }}>Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      {/* Header with search */}
      <header className="sticky top-0 z-10 px-4 py-3 space-y-3" style={{ backgroundColor: "#F4F1EA" }}>
        <h1 className="text-xl font-semibold" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: "#2A2A2A" }}>
          The Village
        </h1>
        {memos.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4" style={{ color: "#8B7D8B" }} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher dans vos notes..."
              className="w-full pl-9 pr-3 py-2.5 outline-none"
              style={{
                backgroundColor: "#FFFFFF",
                border: "1px solid #E8E3DB",
                borderRadius: 8,
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                color: "#2A2A2A",
              }}
            />
          </div>
        )}
      </header>

      <main className="flex-1 px-4 pb-24">
        {loadingMemos ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 rounded-xl animate-pulse" style={{ backgroundColor: "#E8E3DB" }} />
            ))}
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            {memos.length === 0 ? (
              <>
                <span className="text-4xl">🌿</span>
                <h2 className="text-lg font-semibold" style={{ color: "#2A2A2A" }}>
                  Votre timeline est prête
                </h2>
                <p className="text-sm max-w-[260px]" style={{ color: "#8B7D8B" }}>
                  Enregistrez votre premier mémo après la prochaine séance. C'est rapide et facile.
                </p>
              </>
            ) : (
              <p style={{ color: "#8B7D8B" }}>Aucun résultat pour « {searchQuery} »</p>
            )}
          </div>
        ) : (
          <div>
            {grouped.map((group) => (
              <div key={group.key}>
                {/* Month header */}
                <div
                  className="sticky top-[88px] z-[5]"
                  style={{
                    paddingTop: 24,
                    paddingBottom: 8,
                    backgroundColor: "#F4F1EA",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: "#8B7D8B",
                      letterSpacing: "0.08em",
                    }}
                  >
                    {group.label}
                  </span>
                </div>

                {/* Timeline entries */}
                <div className="relative" style={{ paddingLeft: 36 }}>
                  {/* Vertical line */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: 15,
                      width: 2,
                      backgroundColor: "#E8E3DB",
                    }}
                  />

                  {group.memos.map((memo) => {
                    const structured = memo.content_structured as {
                      resume?: string;
                      tags?: string[];
                    } | null;
                    const displayDate = memo.memo_date
                      ? format(new Date(memo.memo_date), "dd MMM", { locale: fr })
                      : format(new Date(memo.created_at), "dd MMM", { locale: fr });
                    const tags = structured?.tags || [];
                    const visibleTags = tags.slice(0, 3);
                    const extraCount = tags.length - 3;

                    return (
                      <div
                        key={memo.id}
                        className="relative"
                        style={{ marginBottom: 12 }}
                      >
                        {/* Dot */}
                        <div
                          className="absolute"
                          style={{
                            left: -25,
                            top: 18,
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            backgroundColor: "#6B8CAE",
                            border: "2px solid #F4F1EA",
                          }}
                        />

                        {/* Card */}
                        <div
                          onClick={() => {
                            if (memo.processing_status === "done") {
                              navigate(`/memo-result/${memo.id}`);
                            }
                          }}
                          className="cursor-pointer transition-shadow"
                          style={{
                            backgroundColor: "#FFFFFF",
                            border: "1px solid #E8E3DB",
                            borderRadius: 12,
                            padding: 16,
                            boxShadow: "0 2px 8px rgba(42,42,42,0.06)",
                          }}
                        >
                          {/* Top row: date + avatar + intervenant */}
                          <div className="flex items-center justify-between">
                            <span
                              style={{
                                fontFamily: "Inter, sans-serif",
                                fontSize: 12,
                                color: "#8B7D8B",
                              }}
                            >
                              {displayDate}
                            </span>
                            {memo.intervenant && (() => {
                              const { icon: Icon, bg } = getSpecialiteAvatar(memo.intervenant!.specialite);
                              return (
                                <div className="flex items-center" style={{ gap: 6 }}>
                                  <div
                                    className="flex items-center justify-center shrink-0"
                                    style={{
                                      width: 32,
                                      height: 32,
                                      borderRadius: "50%",
                                      backgroundColor: bg,
                                      border: "2px solid #F4F1EA",
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
                                      <Icon size={16} color="#FFFFFF" />
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: "Inter, sans-serif",
                                      fontSize: 12,
                                      color: "#8B7D8B",
                                    }}
                                  >
                                    {memo.intervenant!.nom}
                                  </span>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Resume */}
                          {structured?.resume && (
                            <p
                              className="line-clamp-2"
                              style={{
                                marginTop: 8,
                                fontFamily: "Inter, sans-serif",
                                fontSize: 14,
                                fontWeight: 400,
                                color: "#2A2A2A",
                                lineHeight: 1.5,
                              }}
                            >
                              {structured.resume}
                            </p>
                          )}

                          {/* Tags */}
                          {visibleTags.length > 0 && (
                            <div className="flex flex-wrap items-center" style={{ marginTop: 8, gap: 6 }}>
                              {visibleTags.map((tag, i) => {
                                const color = getTagColor(tag);
                                return (
                                  <span
                                    key={i}
                                    style={{
                                      borderRadius: 6,
                                      borderLeft: `3px solid ${color}`,
                                      backgroundColor: hexToRgba(color, 0.1),
                                      padding: "3px 8px",
                                      fontFamily: "Inter, sans-serif",
                                      fontSize: 11,
                                      color: "#6B5B73",
                                    }}
                                  >
                                    {tag}
                                  </span>
                                );
                              })}
                              {extraCount > 0 && (
                                <span
                                  style={{
                                    fontFamily: "Inter, sans-serif",
                                    fontSize: 11,
                                    color: "#8B7D8B",
                                  }}
                                >
                                  +{extraCount}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => setSheetOpen(true)}
        className="fixed z-20 flex items-center justify-center"
        style={{
          bottom: 24,
          right: 24,
          height: 56,
          width: 56,
          borderRadius: "50%",
          backgroundColor: "#6B8CAE",
          color: "#FFFFFF",
          boxShadow: "0 4px 16px rgba(107,140,174,0.4)",
          border: "none",
        }}
        aria-label="Ajouter"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent hideClose className="w-[85vw] max-w-md rounded-2xl border-none shadow-xl p-0 gap-0 [&~[data-state]]:bg-black/40">
          <DialogHeader className="flex flex-row items-center justify-end px-4 pt-3 pb-0">
            <DialogTitle className="sr-only">Ajouter</DialogTitle>
            <button
              onClick={() => setSheetOpen(false)}
              className="rounded-full p-1 hover:bg-muted transition-colors"
              style={{ color: "#8B7D8B" }}
            >
              <X className="h-4 w-4" />
            </button>
          </DialogHeader>
          <nav className="px-2 pb-4 pt-1">
            {menuItems.map((item) => (
              <button
                key={item.route}
                onClick={() => { setSheetOpen(false); navigate(item.route); }}
                className="flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left hover:bg-muted transition-colors"
              >
                <span className="text-2xl">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: "#2A2A2A" }}>{item.label}</p>
                  <p className="text-sm" style={{ color: "#8B7D8B" }}>{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0" style={{ color: "#8B7D8B" }} />
              </button>
            ))}
          </nav>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Timeline;
