import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronRight, Sparkles } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const CAS_USAGE = [
{
  key: "pick_me_up",
  emoji: "✨",
  title: "Un remontant",
  subtitle: "Rappelle-moi ce qui s'est passé",
  route: "/outils/synthese/pick-me-up"
},
{
  key: "mdph",
  emoji: "📋",
  title: "Dossier MDPH",
  subtitle: "Aide moi à préparer mon dossier",
  route: "/outils/synthese/mdph"
},
{
  key: "transmission",
  emoji: "📖",
  title: "Transmission",
  subtitle: "__DYNAMIC_TRANSMISSION__",
  route: "/outils/synthese/transmission"
},
] as const;

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
  const { user } = useAuth();
  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [activiteCount, setActiviteCount] = useState<number | null>(null);
  const [parentName, setParentName] = useState<string>("");

  // Fetch parent prenom from profiles
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("prenom")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.prenom) {
          setParentName(data.prenom);
        } else {
          // Fallback: extract from email
          const local = (user.email ?? "").split("@")[0] ?? "";
          const name = local.split(/[._-]/)[0] ?? "";
          setParentName(name.charAt(0).toUpperCase() + name.slice(1).toLowerCase());
        }
      });
  }, [user]);

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
          className="text-xl font-serif font-semibold flex-1"
          style={{ color: "#1E1A1A" }}>Synthèse Magique
        </h1>
        <button
          onClick={() => navigate("/archives")}
          style={{ fontSize: 12, color: "#8B74E0", fontWeight: 500, background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Mes archives →
        </button>
      </header>

      <main className="flex-1 px-4 pt-5 pb-24">
        {/* Greeting bubble */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            }}
          >
            <Sparkles size={18} color="#fff" />
          </div>
          <div className="flex-1 min-w-0">
            <span
              className="block mb-1 font-sans font-medium"
              style={{ color: "#8B74E0", fontSize: 10 }}
            >
              The Village
            </span>
            <div
              className="px-4 py-3 inline-block"
              style={{
                ...glassCard,
                background: "rgba(139,116,224,0.07)",
                border: "1px solid rgba(139,116,224,0.18)",
                maxWidth: "92%",
              }}
            >
              <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
                Bonjour {parentName} 👋
              </p>
            </div>
          </div>
        </div>

        {/* Counter bubble — no avatar, aligned under first bubble */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0" style={{ width: 36 }} />
          <div className="flex-1 min-w-0">
            <div
              className="px-4 py-3 inline-block"
              style={{
                ...glassCard,
                background: "rgba(139,116,224,0.07)",
                border: "1px solid rgba(139,116,224,0.18)",
                maxWidth: "92%",
              }}
            >
              <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
                {countsLoaded ? (
                  <>
                    J'ai <span className="font-semibold">{memoCount}</span> mémo{memoCount !== 1 ? "s" : ""} et{" "}
                    <span className="font-semibold">{activiteCount}</span> activité{activiteCount !== 1 ? "s" : ""} de{" "}
                    <span className="font-semibold">{displayName}</span> dans mes données.
                    {" "}De quoi avez-vous besoin aujourd'hui&nbsp;?
                  </>
                ) : (
                  <>Chargement des données de {displayName}…</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Option cards — indented under the bubble */}
        <div className="flex flex-col gap-2.5 ml-12">
          {CAS_USAGE.map((cas) => {
            return (
              <button
                key={cas.key}
                onClick={() => navigate(cas.route)}
                className="flex items-center gap-3 px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
                style={{ ...glassCard, maxWidth: "92%" }}
              >
                <span className="flex-shrink-0 text-[24px] leading-none">{cas.emoji}</span>
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-[15px] font-serif font-semibold leading-tight"
                    style={{ color: "#1E1A1A" }}
                  >
                    {cas.title}
                  </span>
                  <span
                    className="block text-[13px] font-sans leading-snug mt-0.5"
                    style={{ color: "#9A9490" }}
                  >
                    {cas.subtitle === "__DYNAMIC_TRANSMISSION__" ? `Présenter ${displayName} à un nouvel interlocuteur` : cas.subtitle}
                  </span>
                </div>
                <ChevronRight size={18} style={{ color: "#9A9490" }} className="flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </main>

      <BottomNavBar />
    </div>);

};

export default OutilsSynthese;