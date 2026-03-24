import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import PreciserBlocDrawer from "@/components/synthese/PreciserBlocDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

interface Block {
  id: string;
  title: string;
  cerfa_ref?: string;
  cerfa_ref_complementaire?: string;
  icon?: string;
  content: string;
  editorial_note?: string | null;
  signal?: string | null;
}

export default function OutilsSyntheseMdphResultats() {
  const location = useLocation();
  const navigate = useNavigate();
  const syntheseId = location.state?.syntheseId as string | undefined;
  const enfantId = useEnfantId();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBloc, setSelectedBloc] = useState<Block | null>(null);

  useEffect(() => {
    if (!syntheseId) {
      navigate("/outils/synthese/mdph", { replace: true });
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error: err } = await supabase
        .from("syntheses")
        .select("contenu")
        .eq("id", syntheseId)
        .maybeSingle();

      if (err || !data?.contenu) {
        setError("Impossible de charger la synthèse.");
        setLoading(false);
        return;
      }

      try {
        const parsed = JSON.parse(data.contenu);
        setBlocks(parsed.blocks ?? parsed);
      } catch {
        setError("Format de données invalide.");
      }
      setLoading(false);
    };

    fetch();
  }, [syntheseId, navigate]);

  const handleBlockUpdated = (blocId: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blocId ? { ...b, content: newContent } : b))
    );
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/outils/synthese/mdph")} className="p-1">
          <ArrowLeft size={22} color="#1E1A1A" />
        </button>
        <h1 className="text-[17px] font-semibold" style={{ fontFamily: "Fraunces, serif", color: "#1E1A1A" }}>
          Résultats MDPH
        </h1>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {loading && <p className="text-center text-sm" style={{ color: "#9A9490" }}>Chargement…</p>}
        {error && <p className="text-center text-sm" style={{ color: "#E8736A" }}>{error}</p>}

        {blocks.map((block) => (
          <div key={block.id} style={{ ...glassCard, padding: "16px" }}>
            <h2 className="text-[15px] font-semibold mb-1" style={{ fontFamily: "Fraunces, serif", color: "#1E1A1A" }}>
              {block.title}
            </h2>

            {block.cerfa_ref && (
              <p className="text-[11px] mb-2" style={{ color: "#9A9490" }}>
                {block.cerfa_ref}
              </p>
            )}

            <p className="text-[13px] leading-relaxed mb-3" style={{ fontFamily: "DM Sans, sans-serif", color: "#1E1A1A" }}>
              {block.content}
            </p>

            {block.editorial_note && (
              <p className="text-[11px] italic mb-2" style={{ color: "#8B74E0" }}>
                {block.editorial_note}
              </p>
            )}

            {block.signal && (
              <p className="text-[11px] mb-2" style={{ color: "#E8A44A" }}>
                {block.signal}
              </p>
            )}

            <button
              onClick={() => { setSelectedBloc(block); setDrawerOpen(true); }}
              className="text-[12px] font-medium"
              style={{ color: "#8B74E0" }}
            >
              Préciser ce bloc
            </button>
          </div>
        ))}
      </div>

      {syntheseId && enfantId && (
        <PreciserBlocDrawer
          isOpen={drawerOpen}
          onClose={() => { setDrawerOpen(false); setSelectedBloc(null); }}
          bloc={selectedBloc ? { id: selectedBloc.id, title: selectedBloc.title, content: selectedBloc.content, cas_usage: "mdph" } : null}
          enfantId={enfantId}
          syntheseId={syntheseId}
          onBlockUpdated={handleBlockUpdated}
        />
      )}

      <BottomNavBar />
    </div>
  );
}