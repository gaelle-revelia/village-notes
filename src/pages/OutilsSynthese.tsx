import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";

const CAS_USAGE = [
{
  key: "pick_me_up",
  emoji: "✨",
  title: "Pick-me-up",
  subtitle: "Rappelle-moi ce qui s'est passé",
  route: "/outils/synthese/pick-me-up"
},
{
  key: "mdph",
  emoji: "📋",
  title: "Dossier MDPH",
  subtitle: "Prépare mon dossier MDPH",
  route: "/outils/synthese/mdph"
},
{
  key: "rdv",
  emoji: "🩺",
  title: "Préparer un RDV",
  subtitle: "Briefing, présenter ou transmettre",
  route: "/outils/synthese/rdv"
},
{
  key: "transmission",
  emoji: "📖",
  title: "Transmission",
  subtitle: "Fais connaître {prenom}",
  route: "/outils/synthese/transmission"
}] as
const;

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
  "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"
};

const OutilsSynthese = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [activiteCount, setActiviteCount] = useState<number | null>(null);

  useEffect(() => {
    if (!enfantId) return;
    const fetchCounts = async () => {
      const [memosRes, sessionsRes] = await Promise.all([
      supabase.
      from("memos").
      select("id", { count: "exact", head: true }).
      eq("enfant_id", enfantId),
      supabase.
      from("sessions_activite").
      select("id", { count: "exact", head: true }).
      eq("enfant_id", enfantId)]
      );
      setMemoCount(memosRes.count ?? 0);
      setActiviteCount(sessionsRes.count ?? 0);
    };
    fetchCounts();
  }, [enfantId]);

  const displayName = prenom ?? "votre enfant";
  const countsLoaded = memoCount !== null && activiteCount !== null;

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
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
        }}>
        
        <button
          onClick={() => navigate("/outils")}
          className="flex items-center justify-center"
          aria-label="Retour">
          
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1
          className="text-xl font-serif font-semibold"
          style={{ color: "#1E1A1A" }}>Synthèse Magique


        </h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-24">
        {/* IA bubble */}
        <div
          className="mb-6 px-4 py-3"
          style={{
            ...glassCard,
            background: "rgba(139,116,224,0.07)",
            border: "1px solid rgba(139,116,224,0.18)"
          }}>
          
          <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
            {countsLoaded ?
            <>
                J'ai <span className="font-semibold">{memoCount}</span> mémo{memoCount !== 1 ? "s" : ""} et{" "}
                <span className="font-semibold">{activiteCount}</span> activité{activiteCount !== 1 ? "s" : ""} de{" "}
                <span className="font-semibold">{displayName}</span> dans mes données.
                {" "}De quoi as-tu besoin aujourd'hui ?
              </> :

            <>Chargement des données de {displayName}…</>
            }
          </p>
        </div>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {CAS_USAGE.map((cas) => {
            const subtitle =
            cas.key === "transmission" ?
            cas.subtitle.replace("{prenom}", displayName) :
            cas.subtitle;

            return (
              <button
                key={cas.key}
                onClick={() => navigate(cas.route)}
                className="flex items-center gap-4 px-4 py-4 text-left transition-transform active:scale-[0.98]"
                style={glassCard}>
                
                {/* Emoji */}
                <span className="flex-shrink-0 text-[28px] leading-none">{cas.emoji}</span>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-[15px] font-serif font-semibold leading-tight"
                    style={{ color: "#1E1A1A" }}>
                    
                    {cas.title}
                  </span>
                  <span
                    className="block text-[13px] font-sans leading-snug mt-0.5"
                    style={{ color: "#9A9490" }}>
                    
                    {subtitle}
                  </span>
                </div>

                {/* Chevron */}
                <ChevronRight size={18} style={{ color: "#9A9490" }} className="flex-shrink-0" />
              </button>);

          })}
        </div>
      </main>

      <BottomNavBar />
    </div>);

};

export default OutilsSynthese;