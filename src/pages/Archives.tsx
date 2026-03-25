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

type TabKey = "mdph" | "pick_me_up" | "transmission";

const TABS: { key: TabKey; label: string }[] = [
  { key: "mdph", label: "Dossier MDPH" },
  { key: "pick_me_up", label: "Remontant" },
  { key: "transmission", label: "Transmission" },
];

function getSubtitle(s: any): string {
  if (s.cas_usage === "mdph") {
    try {
      const parsed = typeof s.contenu === "string" ? JSON.parse(s.contenu) : s.contenu;
      if (parsed?.parent_context?.type_demande) return parsed.parent_context.type_demande;
    } catch {}
    return "Dossier MDPH";
  }
  if (s.cas_usage === "pick_me_up") return "Remontant";
  if (s.cas_usage === "transmission") return "Transmission parcours";
  return "";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function typeLabel(cas: string): string {
  if (cas === "mdph") return "MDPH";
  if (cas === "pick_me_up") return "Remontant";
  if (cas === "transmission") return "Transmission";
  return cas;
}

const Archives = () => {
  const navigate = useNavigate();
  const { enfantId } = useEnfantId();
  const prenom = useEnfantPrenom();
  const [activeTab, setActiveTab] = useState<TabKey>("mdph");
  const [syntheses, setSyntheses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enfantId) return;
    const fetch = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("syntheses")
        .select("id, cas_usage, contenu, created_at, etat")
        .eq("enfant_id", enfantId)
        .order("created_at", { ascending: false });
      setSyntheses(data ?? []);
      setLoading(false);
    };
    fetch();
  }, [enfantId]);

  const filtered = syntheses.filter((s) => s.cas_usage === activeTab);
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
          onClick={() => navigate(-1)}
          className="flex items-center justify-center"
          aria-label="Retour"
        >
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <div>
          <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>
            Archives
          </h1>
          <span className="text-xs font-sans" style={{ color: "#9A9490" }}>
            {displayName}
          </span>
        </div>
      </header>

      {/* Tabs */}
      <div
        className="flex border-b px-4 gap-4"
        style={{ borderColor: "rgba(0,0,0,0.06)" }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="pb-2 text-[13px] font-sans font-medium transition-colors"
            style={{
              color: activeTab === tab.key ? "#8B74E0" : "#9A9490",
              borderBottom: activeTab === tab.key ? "2px solid #8B74E0" : "2px solid transparent",
              background: "none",
              border: "none",
              borderBottomWidth: 2,
              borderBottomStyle: "solid",
              borderBottomColor: activeTab === tab.key ? "#8B74E0" : "transparent",
              cursor: "pointer",
              padding: "10px 0 8px",
            }}
          >
            {tab.label}
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
            const subtitle = getSubtitle(s);
            const date = formatDate(s.created_at);
            return (
              <button
                key={s.id}
                className="w-full text-left transition-transform active:scale-[0.98]"
                style={{ ...glassCard, padding: "14px 16px", marginBottom: 10, cursor: "pointer" }}
                onClick={() => {
                  if (s.cas_usage === "mdph") {
                    navigate("/outils/synthese/mdph/resultats", { state: { syntheseId: s.id } });
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <span
                      className="inline-block text-[11px] font-sans font-semibold px-2 py-0.5 rounded-full mb-1"
                      style={{ background: "rgba(139,116,224,0.12)", color: "#8B74E0" }}
                    >
                      {typeLabel(s.cas_usage)}
                    </span>
                    <p className="text-[14px] font-sans font-medium mt-1" style={{ color: "#1E1A1A" }}>
                      {subtitle} · {displayName}
                    </p>
                    <p className="text-[12px] font-sans mt-0.5" style={{ color: "#9A9490" }}>
                      {date}
                    </p>
                  </div>
                  <ChevronRight size={18} style={{ color: "#9A9490" }} className="flex-shrink-0" />
                </div>
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
