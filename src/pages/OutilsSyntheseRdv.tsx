import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const OutilsSyntheseRdv = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const displayName = prenom ?? "votre enfant";

  const options = [
    {
      key: "briefing",
      emoji: "🩺",
      title: "Briefing séance",
      subtitle: "Intervenant connu — ce qui s'est passé depuis la dernière fois",
      route: "/outils/synthese/rdv/briefing",
    },
    {
      key: "presentation",
      emoji: "👋",
      title: `Présenter ${displayName}`,
      subtitle: "Nouvel intervenant ou nouvelle structure",
      route: "/outils/synthese/rdv/presentation",
    },
    {
      key: "transmission",
      emoji: "📖",
      title: "Transmission",
      subtitle: "Document complet — qui il/elle est, son corps, ses besoins",
      route: "/outils/synthese/transmission",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
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
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>
          Préparer un RDV
        </h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-24">
        {/* IA bubble */}
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            }}
          >
            <span className="text-[16px] leading-none">✨</span>
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
                C'est quel type de rendez-vous&nbsp;?
              </p>
            </div>
          </div>
        </div>

        {/* Option cards */}
        <div className="flex flex-col gap-2.5 ml-12">
          {options.map((opt) => (
            <button
              key={opt.key}
              onClick={() => navigate(opt.route)}
              className="flex items-center gap-3 px-4 py-3.5 text-left transition-transform active:scale-[0.98]"
              style={{ ...glassCard, maxWidth: "92%" }}
            >
              <span className="flex-shrink-0 text-[24px] leading-none">{opt.emoji}</span>
              <div className="flex-1 min-w-0">
                <span
                  className="block text-[15px] font-serif font-semibold leading-tight"
                  style={{ color: "#1E1A1A" }}
                >
                  {opt.title}
                </span>
                <span
                  className="block text-[13px] font-sans leading-snug mt-0.5"
                  style={{ color: "#9A9490" }}
                >
                  {opt.subtitle}
                </span>
              </div>
              <ChevronRight size={18} style={{ color: "#9A9490" }} className="flex-shrink-0" />
            </button>
          ))}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseRdv;
