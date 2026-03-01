import { useState, useEffect, useMemo, useRef } from "react";
import { Navigate, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Search, ChevronRight, X } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { MemoCard, getDomainsFromTags } from "@/components/memo/MemoCard";
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
  const { role } = useEnfantId();
  const navigate = useNavigate();
  const location = useLocation();
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loadingMemos, setLoadingMemos] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

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

  const filteredMemos = useMemo(() => {
    // Filter out memos with no displayable content
    const displayable = memos.filter(m => {
      if (m.type === 'document' || m.type === 'evenement' || m.type === 'activite') return true;
      const structured = m.content_structured as any;
      return structured?.resume || m.transcription_raw;
    });
    if (!searchQuery.trim()) return displayable;
    const q = searchQuery.toLowerCase();
    return displayable.filter(m => {
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
          <h1 className="text-[28px] font-semibold text-foreground">
            The Village
          </h1>
          <ProfileAvatar />
        </div>
        {memos.length > 0 && (
          <div className="relative">
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

      <Dialog open={sheetOpen} onOpenChange={setSheetOpen}>
        <DialogContent hideClose className="w-[85vw] max-w-md rounded-2xl border-none shadow-xl p-0 gap-0 [&~[data-state]]:bg-black/40">
          <DialogHeader className="flex flex-row items-center justify-end px-4 pt-3 pb-0">
            <DialogTitle className="sr-only">Ajouter</DialogTitle>
            <button
              onClick={() => setSheetOpen(false)}
              className="rounded-full p-1 hover:bg-muted transition-colors text-muted-foreground"
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
                  <p className="font-semibold text-foreground">{item.label}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
              </button>
            ))}
          </nav>
        </DialogContent>
      </Dialog>

      <BottomNavBar />
    </div>
  );
};

export default Timeline;
