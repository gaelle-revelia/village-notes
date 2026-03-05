import { useNavigate } from "react-router-dom";
import { ChevronRight, Sparkles, ClipboardList, Stethoscope, BookOpen } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";

const CAS_USAGE = [
  {
    key: "pick_me_up",
    icon: Sparkles,
    title: "Pick-me-up",
    subtitle: "Rappelle-moi ce qui s'est passé",
    route: "/outils/synthese/pick-me-up",
  },
  {
    key: "mdph",
    icon: ClipboardList,
    title: "Dossier MDPH",
    subtitle: "Prépare mon dossier MDPH",
    route: "/outils/synthese/mdph",
  },
  {
    key: "rdv",
    icon: Stethoscope,
    title: "Préparer un RDV",
    subtitle: "Briefing, présenter ou transmettre",
    route: "/outils/synthese/rdv",
  },
  {
    key: "transmission",
    icon: BookOpen,
    title: "Transmission",
    subtitle: "Fais connaître {prenom}",
    route: "/outils/synthese/transmission",
  },
] as const;

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const OutilsSynthese = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button
          onClick={() => navigate("/outils")}
          className="mr-3 flex items-center justify-center"
          aria-label="Retour"
        >
          <ChevronRight size={20} className="rotate-180" style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-lg font-serif font-semibold" style={{ color: "#1E1A1A" }}>
          Synthèse magique
        </h1>
      </header>

      <main className="flex-1 px-4 pt-6 pb-24">
        {/* Title */}
        <h2
          className="font-serif font-semibold text-[22px] leading-tight mb-2"
          style={{ color: "#1E1A1A" }}
        >
          De quoi as-tu besoin ?
        </h2>
        <p
          className="text-[14px] font-sans leading-snug mb-6"
          style={{ color: "#9A9490" }}
        >
          Je vais analyser les notes de {prenom ?? "votre enfant"} et préparer exactement ce
          qu'il te faut.
        </p>

        {/* Cards */}
        <div className="flex flex-col gap-3">
          {CAS_USAGE.map((cas) => {
            const Icon = cas.icon;
            const subtitle = cas.key === "transmission"
              ? cas.subtitle.replace("{prenom}", prenom ?? "votre enfant")
              : cas.subtitle;

            return (
              <button
                key={cas.key}
                onClick={() => navigate(cas.route)}
                className="flex items-center gap-4 px-4 py-4 text-left transition-transform active:scale-[0.98]"
                style={glassCard}
              >
                {/* Icon circle */}
                <div
                  className="flex-shrink-0 flex items-center justify-center rounded-xl"
                  style={{
                    width: 44,
                    height: 44,
                    background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                  }}
                >
                  <Icon size={22} color="#fff" strokeWidth={2} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <span
                    className="block text-[15px] font-sans font-semibold leading-tight"
                    style={{ color: "#1E1A1A" }}
                  >
                    {cas.title}
                  </span>
                  <span
                    className="block text-[13px] font-sans leading-snug mt-0.5"
                    style={{ color: "#9A9490" }}
                  >
                    {subtitle}
                  </span>
                </div>

                {/* Chevron */}
                <ChevronRight size={18} style={{ color: "#9A9490" }} className="flex-shrink-0" />
              </button>
            );
          })}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
};

export default OutilsSynthese;
