import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
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
  const fromArchives = location.state?.from === "archives";
  const { enfantId } = useEnfantId();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedBloc, setSelectedBloc] = useState<Block | null>(null);
  const [enfantPrenom, setEnfantPrenom] = useState("");
  const [syntheseDate, setSyntheseDate] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [parentPrenom, setParentPrenom] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [titre, setTitre] = useState<string>("");
  const [editingTitre, setEditingTitre] = useState(false);
  const [envoye, setEnvoye] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce dossier définitivement ?")) return;
    setIsDeleting(true);
    await supabase.from("syntheses").delete().eq("id", syntheseId);
    navigate("/archives");
  };

  useEffect(() => {
    if (!syntheseId) {
      navigate("/outils/synthese/mdph", { replace: true });
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      // Fetch synthese
      const { data: syntheseData, error: err } = await supabase
        .from("syntheses")
        .select("contenu, created_at, enfant_id, titre, envoye")
        .eq("id", syntheseId)
        .maybeSingle();

      if (err || !syntheseData?.contenu) {
        setError("Impossible de charger la synthèse.");
        setLoading(false);
        return;
      }

      // Format date
      setSyntheseDate(
        new Date(syntheseData.created_at!).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      );

      // Fetch enfant prenom
      const { data: enfantData } = await supabase
        .from("enfants")
        .select("prenom")
        .eq("id", syntheseData.enfant_id)
        .maybeSingle();

      if (enfantData?.prenom) setEnfantPrenom(enfantData.prenom);

      // Fetch parent prenom
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("prenom")
          .eq("user_id", user.id)
          .maybeSingle();
        if (profileData?.prenom) setParentPrenom(profileData.prenom);
      }

      try {
        const parsed = JSON.parse(syntheseData.contenu);
        setBlocks(parsed.blocks ?? parsed);
      } catch {
        setError("Format de données invalide.");
      }
      setLoading(false);
    };

    fetchData();
  }, [syntheseId, navigate]);

  const handleBlockUpdated = (blocId: string, newContent: string) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === blocId ? { ...b, content: newContent } : b))
    );
  };

  return (
    <div className="min-h-screen pb-28" style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}>
      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(fromArchives ? "/archives" : "/outils/synthese")} className="p-1" aria-label="Retour">
            <ArrowLeft size={22} color="#1E1A1A" />
          </button>
          <div>
            <h1 className="text-[17px] font-semibold" style={{ fontFamily: "Fraunces, serif", color: "#1E1A1A" }}>
              Dossier MDPH — {enfantPrenom}
            </h1>
            <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}>
              Généré le {syntheseDate}
            </p>
          </div>
        </div>
        <button onClick={handleDelete} disabled={isDeleting} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }} aria-label="Supprimer">
          <Trash2 size={18} color="#E8736A" />
        </button>
      </div>

      <div style={{ margin: "16px 16px 8px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "10px 13px" }}>
        <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.6, margin: 0 }}>
          Ces textes sont une base de travail. Copie chaque bloc dans la section correspondante de ton formulaire CERFA, puis ajuste si besoin. Utilise "Préciser ce bloc" pour affiner si besoin avant de copier.
        </p>
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
              <span
                className="inline-block text-[10px] font-medium mb-2 px-2 py-0.5"
                style={{
                  borderRadius: 6,
                  background: "rgba(139,116,224,0.1)",
                  color: "#8B74E0",
                }}
              >
                {block.cerfa_ref}
              </span>
            )}

            <p className="text-[13px] leading-relaxed mb-3" style={{ fontFamily: "DM Sans, sans-serif", color: "#1E1A1A" }}>
              {block.content}
            </p>

            {block.editorial_note && (
              <div className="mb-2 flex" style={{ gap: 8 }}>
                <div style={{ width: 3, borderRadius: 2, background: "#8B74E0", flexShrink: 0 }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "#8B74E0" }}>
                  {block.editorial_note}
                </p>
              </div>
            )}

            {block.signal && (
              <div className="mb-2 flex" style={{ gap: 8 }}>
                <div style={{ width: 3, borderRadius: 2, background: "#E8A44A", flexShrink: 0 }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "#E8A44A" }}>
                  {block.signal}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(block.content);
                  setCopied(block.id);
                  setTimeout(() => setCopied(null), 2000);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.48)",
                  border: "1px solid rgba(139,116,224,0.3)",
                  color: "#8B74E0",
                  cursor: "pointer",
                }}
              >
                {copied === block.id ? "Copié ✓" : "Copier"}
              </button>
              <button
                onClick={() => {
                  setSelectedBloc(block);
                  setDrawerOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.48)",
                  border: "1px solid rgba(232,115,106,0.3)",
                  color: "#E8736A",
                  cursor: "pointer",
                }}
              >
                Préciser ce bloc
              </button>
            </div>
          </div>
        ))}


        {/* Footer */}
        {blocks.length > 0 && (
          <div className="pt-2 pb-4 space-y-3">
            <p style={{ fontSize: 11, color: "#9A9490", textAlign: "center", lineHeight: 1.6, marginBottom: 12 }}>
              Synthèse des observations de {parentPrenom} pour {enfantPrenom} · The Village ·{" "}
              {new Date().toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="email@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  fontSize: 13,
                  background: "rgba(255,255,255,0.58)",
                  border: "1px solid rgba(255,255,255,0.9)",
                  color: "#1E1A1A",
                  outline: "none",
                }}
              />
              <button
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 500,
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                Envoyer →
              </button>
            </div>
          </div>
        )}
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
