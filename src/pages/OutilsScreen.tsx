import { useNavigate } from "react-router-dom";
import { Activity, Sparkles, CalendarDays, Share2, Wind } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";

const TOOLS = [
  { label: "Suivi d'activités", icon: Activity, route: "/outils/activites", active: true },
  { label: "Synthèse magique", icon: Sparkles, route: "/outils/synthese", active: true },
  { label: "Cohérence cardiaque", subtitle: "Respiration guidée", icon: Wind, route: "/outils/coherence", active: true, iconBg: "linear-gradient(135deg, #E8A44A, #E8736A)", iconColor: "#fff" },
  { label: "Planning", icon: CalendarDays, route: null, active: false },
  { label: "Export", icon: Share2, route: null, active: false },
] as const;

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const OutilsScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: "#1E1A1A", letterSpacing: -0.5 }}>Outils</h1>
        <ProfileAvatar />
      </header>

      <main className="flex-1 px-4 pt-6 pb-24">
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                disabled={!tool.active}
                onClick={() => tool.route && navigate(tool.route)}
                className="relative flex flex-col items-center justify-center gap-3 p-5 text-center transition-transform active:scale-[0.97]"
                style={{
                  ...glassCard,
                  opacity: tool.active ? 1 : 0.5,
                  cursor: tool.active ? "pointer" : "default",
                  minHeight: 140,
                }}
              >
                {!tool.active && (
                  <span
                    className="absolute top-2.5 right-2.5 text-[9px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,116,224,0.15)", color: "#8B74E0" }}
                  >
                    Bientôt
                  </span>
                )}
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 44,
                    height: 44,
                    background: tool.active
                      ? ("iconBg" in tool && tool.iconBg ? tool.iconBg : "linear-gradient(135deg, #E8736A, #8B74E0)")
                      : "rgba(138,155,174,0.15)",
                  }}
                >
                  <Icon size={22} color={tool.active ? ("iconColor" in tool && tool.iconColor ? tool.iconColor : "#fff") : "#8A9BAE"} strokeWidth={2} />
                </div>
                <span
                  className="text-[13px] font-sans font-medium leading-tight"
                  style={{ color: tool.active ? "#1E1A1A" : "#9A9490" }}
                >
                  {tool.label}
                </span>
                {"subtitle" in tool && tool.subtitle && (
                  <span
                    className="text-[10px] font-sans font-normal leading-tight"
                    style={{ color: "#9A9490", marginTop: -2 }}
                  >
                    {tool.subtitle}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <BottomNavBar />
    </div>
  );
};

export default OutilsScreen;
