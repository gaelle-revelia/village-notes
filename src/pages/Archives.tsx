import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { supabase } from "@/integrations/supabase/client";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const TABS = ["tous", "mdph", "pick_me_up", "transmission"] as const;
type Tab = typeof TABS[number];

const TAB_LABELS: Record<Tab, string> = {
  tous: "Tous",
  mdph: "MDPH",
  pick_me_up: "Remontant",
  transmission: "Transmission",
};

const BADGE_STYLES: Record<string, { bg: string; color: string }> = {
  mdph: { bg: "rgba(139,116,224,0.12)", color: "#8B74E0" },
  pick_me_up: { bg: "rgba(232,196,74,0.12)", color: "#9A7A00" },
  transmission: { bg: "rgba(68,168,130,0.12)", color: "#2a8a6a" },
};

function getBadgeLabel(s: any): string {
  if (s.cas_usage === "mdph") {
    try {
      const parsed = typeof s.contenu === "string" ? JSON.parse(s.contenu ?? "{}") : s.contenu;
      return parsed?.parent_context?.type_demande ?? "MDPH";
    } catch {
      return "MDPH";
    }
  }
  if (s.cas_usage === "pick_me_up") return "Remontant";
  if (s.cas_usage === "transmission") return "Transmission";
  return "";
}

function getCardLabel(s: any): string {
  if (s.titre?.trim()) return s.titre.trim();
  if (s.cas_usage === "pick_me_up") return "Remontant";
  if (s.cas_usage === "transmission") return "Transmission parcours";
  try {
    const parsed = typeof s.contenu === "string" ? JSON.parse(s.contenu ?? "{}") : s.contenu;
    return parsed?.parent_context?.type_demande ?? "Dossier MDPH";
  } catch {
    return "Dossier MDPH";
  }
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const Archives = () => {
  const navigate = useNavigate();
  const { enfantId } = useEnfantId();
  const prenom = useEnfantPrenom();
  const [activeFilters, setActiveFilters] = useState<string[]>(["tous"]);
  const [syntheses, setSyntheses] = useState<any[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    if (!enfantId) return;
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("syntheses")
        .select("id, cas_usage, contenu, created_at, etat, user_id, envoye, titre")
        .eq("enfant_id", enfantId)
        .order("created_at", { ascending: false });
      const items = data ?? [];
      setSyntheses(items);

      const userIds = [...new Set(items.map((s: any) => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, prenom")
          .in("user_id", userIds);
        setProfilesMap(Object.fromEntries(
          (profilesData ?? []).map(p => [p.user_id, p.prenom ?? ""])
        ));
      }
      setLoading(false);
    };
    fetchData();
  }, [enfantId]);

  const toggleFilter = (key: string) => {
    if (key === "tous") { setActiveFilters(["tous"]); return; }
    const withoutTous = activeFilters.filter(f => f !== "tous");
    if (withoutTous.includes(key)) {
      const next = withoutTous.filter(f => f !== key);
      setActiveFilters(next.length === 0 ? ["tous"] : next);
    } else {
      setActiveFilters([...withoutTous, key]);
    }
  };

  const filtered = activeFilters.includes("tous")
    ? syntheses
    : syntheses.filter((s) => activeFilters.includes(s.cas_usage));

  const displayName = prenom ?? "Enfant";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button
          onClick={() => navigate("/outils/synthese")}
          className="flex items-center justify-center"
          aria-label="Retour"
        >
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <div>
          <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>
            Archives
          </h1>
          <p style={{ fontSize: 11, color: "#9A9490", margin: 0 }}>
            {syntheses.length} synthèse{syntheses.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "10px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        {[
          { key: "tous", label: "Tout" },
          { key: "mdph", label: "MDPH" },
          { key: "pick_me_up", label: "Remontant" },
          { key: "transmission", label: "Transmission" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => toggleFilter(f.key)}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 500,
              whiteSpace: "nowrap",
              border: "none",
              cursor: "pointer",
              background: activeFilters.includes(f.key) ? "#8B74E0" : "rgba(255,255,255,0.58)",
              color: activeFilters.includes(f.key) ? "#fff" : "#1E1A1A",
              boxShadow: activeFilters.includes(f.key) ? "none" : "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="flex-1 px-4 pt-4 pb-24">
        {loading ? (
          <p className="text-center text-sm font-sans mt-10" style={{ color: "#9A9490" }}>
            Chargement…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-sm font-sans mt-10" style={{ color: "#9A9490" }}>
            Aucune synthèse pour l'instant.
          </p>
        ) : (
          filtered.map((s) => {
            const badgeLabel = getBadgeLabel(s);
            const date = formatDate(s.created_at);
            const badge = BADGE_STYLES[s.cas_usage] ?? BADGE_STYLES.mdph;
            return (
              <button
                key={s.id}
                className="w-full text-left transition-transform active:scale-[0.98]"
                style={{ ...glassCard, padding: "10px 14px", marginBottom: 8, cursor: "pointer" }}
                onClick={() => {
                  if (s.cas_usage === "mdph") {
                    navigate("/outils/synthese/mdph/resultats", { state: { syntheseId: s.id, from: "archives" } });
                  } else if (s.cas_usage === "pick_me_up") {
                    navigate("/outils/synthese/pick-me-up", { state: { syntheseId: s.id, readOnly: true } });
                  } else if (s.cas_usage === "transmission") {
                    navigate("/outils/synthese/transmission", { state: { syntheseId: s.id, readOnly: true } });
                  }
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      className="text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: badge.bg, color: badge.color, whiteSpace: "nowrap" }}
                    >
                      {badgeLabel}
                    </span>
                    <span style={{ fontSize: 11, color: "#9A9490" }}>{date}</span>
                  </div>
                  <ChevronRight size={14} style={{ color: "#8B74E0" }} className="flex-shrink-0" />
                </div>
                <p style={{ fontSize: 13, fontWeight: 500, color: "#1E1A1A", margin: "4px 0 0" }}>
                  {getCardLabel(s)}
                </p>
                {s.envoye && (
                  <span style={{ fontSize: 10, color: "#44A882", fontWeight: 500 }}>Déposé ✓</span>
                )}
                <p style={{ fontSize: 11, color: "#9A9490", margin: "2px 0 0" }}>
                  Généré par {profilesMap[s.user_id] ?? "inconnu"}
                </p>
              </button>
            );
          })
        )}
      </main>

      <BottomNavBar />
    </div>
  );
};

export default Archives;
