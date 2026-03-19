import { type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CalendarDays, MessageCircleQuestion, Share2, Sparkles, Wind } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";

const TOOLS = [
  { label: "Suivi d'activités", subtitle: "Motilo, Tummy time, exercices", icon: Activity, route: "/outils/activites", active: true },
  { label: "Synthèse magique", subtitle: "Dossiers et synthèses", icon: Sparkles, route: "/outils/synthese", active: true },
  {
    label: "Questions à poser",
    subtitle: "Préparer les rendez-vous",
    icon: MessageCircleQuestion,
    route: "/outils/questions",
    active: true,
    iconBg: "rgba(29,158,117,0.15)",
    iconColor: "#1D9E75",
  },
  {
    label: "Cohérence cardiaque",
    subtitle: "Respiration guidée",
    icon: Wind,
    route: "/outils/coherence",
    active: true,
    iconBg: "linear-gradient(135deg, hsl(37 78% 60%), hsl(4 68% 66%))",
    iconColor: "hsl(0 0% 100%)",
  },
  { label: "Planning", icon: CalendarDays, route: null, active: false },
  { label: "Export", icon: Share2, route: null, active: false },
] as const;

const glassCard: CSSProperties = {
  background: "hsl(var(--background) / 0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid hsl(var(--background) / 0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px hsl(var(--secondary) / 0.08), 0 1px 4px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(var(--background) / 0.9)",
};

const OutilsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enfantId } = useEnfantId();

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3"
        style={{
          background: "hsl(var(--background) / 0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid hsl(var(--background) / 0.6)",
          boxShadow: "0 2px 12px hsl(var(--foreground) / 0.05)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 30,
            fontWeight: 700,
            color: "hsl(var(--foreground))",
            letterSpacing: -0.5,
          }}
        >
          Outils
        </h1>
        <ProfileAvatar />
      </header>

      <main className="flex-1 px-4 pb-24 pt-6" style={{ paddingTop: 80 }}>
        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                disabled={!tool.active}
                onClick={() => tool.route && navigate(tool.route)}
                className="relative flex min-h-[140px] flex-col items-center justify-center gap-3 p-5 text-center transition-transform active:scale-[0.97]"
                style={{
                  ...glassCard,
                  opacity: tool.active ? 1 : 0.5,
                  cursor: tool.active ? "pointer" : "default",
                }}
              >
                {!tool.active && (
                  <span
                    className="absolute right-2.5 top-2.5 rounded-full px-2 py-0.5 text-[9px] font-sans font-semibold uppercase tracking-wider"
                    style={{
                      background: "hsl(var(--secondary) / 0.15)",
                      color: "hsl(var(--secondary))",
                    }}
                  >
                    Bientôt
                  </span>
                )}
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: tool.active
                      ? "iconBg" in tool && tool.iconBg
                        ? tool.iconBg
                        : "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))"
                      : "hsl(210 18% 61% / 0.15)",
                  }}
                >
                  <Icon
                    size={22}
                    color={
                      tool.active
                        ? "iconColor" in tool && tool.iconColor
                          ? tool.iconColor
                          : "hsl(var(--primary-foreground))"
                        : "hsl(210 18% 61%)"
                    }
                    strokeWidth={2}
                  />
                </div>
                <span
                  className="text-[13px] font-sans font-medium leading-tight"
                  style={{ color: tool.active ? "hsl(var(--foreground))" : "hsl(var(--muted-foreground))" }}
                >
                  {tool.label}
                </span>
                {"subtitle" in tool && tool.subtitle && (
                  <span
                    className="mt-[-2px] text-[10px] font-sans font-normal leading-tight"
                    style={{ color: "hsl(var(--muted-foreground))" }}
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
