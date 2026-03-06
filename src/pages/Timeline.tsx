import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, SlidersHorizontal } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { MemoCard, getDomainsFromTags } from "@/components/memo/MemoCard";
import AddMemoSheet from "@/components/AddMemoSheet";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

type FilterType = "tous" | "rdv" | "activites" | "documents" | "evenements";

const FILTER_PILLS: { key: FilterType; label: string; color: string; bg: string; border: string }[] = [
  { key: "tous", label: "Tous", color: "#8B74E0", bg: "rgba(139,116,224,0.06)", border: "rgba(139,116,224,0.3)" },
  { key: "rdv", label: "Rendez-vous", color: "#5CA8D8", bg: "rgba(92,168,216,0.06)", border: "rgba(92,168,216,0.3)" },
  { key: "activites", label: "Activités", color: "#E8736A", bg: "rgba(232,115,106,0.06)", border: "rgba(232,115,106,0.3)" },
  { key: "documents", label: "Documents", color: "#44A882", bg: "rgba(68,168,130,0.06)", border: "rgba(68,168,130,0.3)" },
  { key: "evenements", label: "Événements", color: "#E8A44A", bg: "rgba(232,164,74,0.06)", border: "rgba(232,164,74,0.3)" },
];

function memoMatchesFilter(type: string | undefined, filter: FilterType): boolean {
  const t = type || "vocal";
  switch (filter) {
    case "rdv": return t === "vocal" || t === "note";
    case "activites": return t === "activite";
    case "documents": return t === "document";
    case "evenements": return t === "evenement";
    default: return true;
  }
}

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

// Domain helpers imported from MemoCard

// --- Reveal card component using IntersectionObserver ---
function RevealCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transition: "opacity 0.4s ease",
      }}
    >
      {children}
    </div>
  );
}

const Timeline = () => {
  const { user, loading } = useAuth();
  const { role, enfantId } = useEnfantId();
  const navigate = useNavigate();
  const location = useLocation();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Set<FilterType>>(() => {
    try {
      const saved = sessionStorage.getItem("timeline_filters");
      if (saved) return new Set(JSON.parse(saved) as FilterType[]);
    } catch {}
    return new Set(["tous"]);
  });
  const bottomRef = useRef<HTMLDivElement>(null);


  useEffect(() => {
    if (!user) return;

    const fetchMemos = async () => {
      const { data } = await supabase
        .from("memos")
        .select("id, created_at, memo_date, type, processing_status, transcription_raw, content_structured, intervenant_id")
        .not("enfant_id", "is", null)
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
  }, [user, location.key]);

  const isFilterActive = !activeFilters.has("tous");

  const toggleFilter = (key: FilterType) => {
    setActiveFilters(prev => {
      let next: Set<FilterType>;
      if (key === "tous") {
        next = new Set<FilterType>(["tous"]);
      } else {
        next = new Set(prev);
        next.delete("tous");
        if (next.has(key)) {
          next.delete(key);
        } else {
          next.add(key);
        }
        if (next.size === 0) next = new Set<FilterType>(["tous"]);
      }
      sessionStorage.setItem("timeline_filters", JSON.stringify([...next]));
      return next;
    });
  };

  const filteredMemos = useMemo(() => {
    // Filter out memos with no displayable content
    const displayable = memos.filter(m => {
      if (m.type === 'document' || m.type === 'evenement' || m.type === 'activite') return true;
      const structured = m.content_structured as any;
      return structured?.resume || m.transcription_raw;
    });

    // Apply type filter
    const typeFiltered = isFilterActive
      ? displayable.filter(m => {
          for (const f of activeFilters) {
            if (memoMatchesFilter(m.type, f)) return true;
          }
          return false;
        })
      : displayable;

    if (!searchQuery.trim()) return typeFiltered;
    const q = searchQuery.toLowerCase();
    return typeFiltered.filter(m => {
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
  }, [memos, searchQuery, activeFilters, isFilterActive]);

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

    // Reverse: oldest group first (top), newest last (bottom)
    // Within each group, oldest memo first, newest last
    groups.reverse();
    for (const g of groups) g.memos.reverse();

    return groups;
  }, [filteredMemos]);

  // Scroll to bottom on initial load (most recent memo visible)
  useEffect(() => {
    if (!loadingMemos && filteredMemos.length > 0) {
      // Small delay to let DOM render
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: "instant" as ScrollBehavior });
      });
    }
  }, [loadingMemos, filteredMemos.length]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 space-y-3"
        style={{
          paddingTop: 20,
          paddingBottom: 12,
          background: "rgba(255, 255, 255, 0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <div className="flex items-center justify-between">
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: "#1E1A1A", letterSpacing: -0.5 }}>
            The Village
          </h1>
          <ProfileAvatar />
        </div>
        {memos.length > 0 && (
          <div className="flex items-center gap-2">
            {/* Filter button */}
            <button
              onClick={() => setFilterDrawerOpen(true)}
              className="relative flex-shrink-0 flex items-center justify-center"
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: isFilterActive ? "rgba(139,116,224,0.12)" : "rgba(255, 255, 255, 0.45)",
                backdropFilter: "blur(12px) saturate(1.4)",
                WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                border: isFilterActive ? "1px solid rgba(139,116,224,0.3)" : "1px solid rgba(255, 255, 255, 0.65)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)",
              }}
              aria-label="Filtrer"
            >
              <SlidersHorizontal className="h-4 w-4" style={{ color: isFilterActive ? "#8B74E0" : "#9A9490" }} />
              {isFilterActive && (
                <div
                  className="absolute"
                  style={{
                    top: 8,
                    right: 8,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#8B74E0",
                  }}
                />
              )}
            </button>

            {/* Search bar */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2.5 outline-none text-sm text-foreground placeholder:text-muted-foreground"
                style={{
                  background: "rgba(255, 255, 255, 0.45)",
                  backdropFilter: "blur(12px) saturate(1.4)",
                  WebkitBackdropFilter: "blur(12px) saturate(1.4)",
                  border: "1px solid rgba(255, 255, 255, 0.65)",
                  borderRadius: 14,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)",
                }}
              />
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 px-4" style={{ paddingBottom: 160 }}>
        {loadingMemos ? (
          <div className="space-y-3 pt-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 animate-pulse rounded-2xl bg-muted" />
            ))}
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            {memos.length === 0 ? (
              <>
                <span className="text-4xl">🌿</span>
                <h2 className="text-lg font-semibold text-foreground">
                  Votre timeline est prête
                </h2>
                <p className="text-sm max-w-[260px] text-muted-foreground">
                  Enregistrez votre premier mémo après la prochaine séance. C'est rapide et facile.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">Aucun résultat pour « {searchQuery} »</p>
            )}
          </div>
        ) : (
          <div>
            {grouped.map((group) => (
              <div key={group.key}>
                {/* Month header */}
                <div className="sticky top-[100px] z-[5]"
                  style={{
                    padding: "20px 0 10px 0",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      color: "#8B74E0",
                      opacity: 0.75,
                      fontSize: 13,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase" as const,
                      whiteSpace: "nowrap",
                    }}>
                      {group.label}
                    </span>
                    <div style={{ flex: 1, height: 1, background: "linear-gradient(90deg, rgba(139,116,224,0.25), transparent)" }} />
                  </div>
                </div>

                {/* Timeline entries */}
                <div className="relative" style={{ paddingLeft: 44 }}>
                  {/* Vertical line — gradient corail → lavande → menthe */}
                  <div
                    className="absolute top-0 bottom-0"
                    style={{
                      left: 16,
                      width: 1.5,
                      background: "linear-gradient(180deg, rgba(232,115,106,0.4) 0%, rgba(139,116,224,0.4) 50%, rgba(68,168,130,0.3) 100%)",
                      borderRadius: 2,
                    }}
                  />

                  {group.memos.map((memo) => {
                    const memoType = memo.type || "vocal";
                    const structured = memo.content_structured as {
                      tags?: string[];
                    } | null;
                    const tags = structured?.tags || [];
                    const domainColors = getDomainsFromTags(tags);
                    const primaryDomainColor = domainColors[0] || "#8A9BAE";

                    // Dot style per type
                    const isEtape = memoType === "evenement";
                    const isDocument = memoType === "document";
                    const isActivite = memoType === "activite";
                    const dotSize = isEtape ? 16 : isDocument ? 13 : 11;
                    const dotStyle: React.CSSProperties = isEtape
                      ? {
                          left: -32 - (dotSize - 11) / 2,
                          marginTop: 13 - (dotSize - 11) / 2,
                          width: dotSize, height: dotSize,
                          borderRadius: "50%",
                          background: "#E8C84A",
                          boxShadow: "0 0 0 4px rgba(232,200,74,0.25)",
                          zIndex: 1,
                        }
                      : isDocument
                      ? {
                          left: -32 - (dotSize - 11) / 2,
                          marginTop: 13 - (dotSize - 11) / 2,
                          width: dotSize, height: dotSize,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.7)",
                          border: "2px solid #8A9BAE",
                          zIndex: 1,
                        }
                      : isActivite
                      ? {
                          left: -32,
                          marginTop: 13,
                          width: 11, height: 11,
                          borderRadius: "50%",
                          background: "#8B74E0",
                          boxShadow: "0 0 0 3px rgba(139,116,224,0.24)",
                          zIndex: 1,
                        }
                      : {
                          left: -32,
                          marginTop: 13,
                          width: 11, height: 11,
                          borderRadius: "50%",
                          background: "rgba(255,255,255,0.7)",
                          backdropFilter: "blur(4px)",
                          WebkitBackdropFilter: "blur(4px)",
                          border: `2.5px solid ${primaryDomainColor}`,
                          boxShadow: `0 0 0 3px ${primaryDomainColor}24`,
                          zIndex: 1,
                        };

                    return (
                      <RevealCard key={memo.id}>
                      <div className="relative" style={{ marginBottom: 16 }}>
                        <div className="absolute" style={dotStyle} />
                        <MemoCard memo={memo} />
                      </div>
                      </RevealCard>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </main>

      {/* FAB — gradient corail → lavande — hidden for famille role */}
      {role !== "famille" && (
        <button
          onClick={() => setSheetOpen(true)}
          className="fixed z-20 flex items-center justify-center"
          style={{
            bottom: 80,
            right: 20,
            height: 46,
            width: 46,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            color: "#FFFFFF",
            boxShadow: "0 6px 20px rgba(139,116,224,0.4)",
            border: "none",
          }}
          aria-label="Ajouter"
        >
          <Plus className="h-5 w-5" />
        </button>
      )}

      <AddMemoSheet open={sheetOpen} onOpenChange={setSheetOpen} enfantId={enfantId} />

      {/* Filter Drawer */}
      <Drawer open={filterDrawerOpen} onOpenChange={setFilterDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center" style={{ fontFamily: "'Fraunces', serif" }}>Afficher</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-4">
            <div className="flex flex-wrap gap-2">
              {FILTER_PILLS.map(pill => {
                const isActive = activeFilters.has(pill.key);
                return (
                  <button
                    key={pill.key}
                    onClick={() => toggleFilter(pill.key)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontSize: 13,
                      fontWeight: 500,
                      background: isActive ? pill.color : pill.bg,
                      color: isActive ? "#FFFFFF" : pill.color,
                      border: isActive ? `1.5px solid ${pill.color}` : `1.5px solid ${pill.border}`,
                      transition: "all 0.2s ease",
                    }}
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
            {isFilterActive && (
              <button
                onClick={() => setActiveFilters(new Set<FilterType>(["tous"]))}
                className="w-full mt-4 py-2.5 text-sm font-medium"
                style={{
                  color: "#8B74E0",
                  background: "rgba(139,116,224,0.08)",
                  borderRadius: 12,
                  border: "1px solid rgba(139,116,224,0.2)",
                }}
              >
                Réinitialiser
              </button>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      <BottomNavBar />
    </div>
  );
};

export default Timeline;
