import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Wrench, Clock } from "lucide-react";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";

const BottomNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { role } = useEnfantId();

  const allTabs = [
    { icon: Home, label: "Accueil", path: "/timeline" },
    { icon: Heart, label: prenom || "Enfant", path: "/selena" },
    { icon: Clock, label: "À venir", path: "/a-venir" },
    { icon: Wrench, label: "Outils", path: "/outils" },
  ];

  // Hide Outils tab for famille role
  const tabs = role === "famille"
    ? allTabs.filter(t => t.path !== "/outils")
    : allTabs;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
      style={{
        minHeight: 60,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderTop: "1px solid rgba(255, 255, 255, 0.65)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center flex-1 h-full border-none bg-transparent"
          >
            <tab.icon
              size={22}
              style={{ color: active ? "#8B74E0" : "rgba(154,148,144,0.8)" }}
            />
            <span
              className="text-[10px] mt-0.5"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? "#8B74E0" : "rgba(154,148,144,0.8)",
              }}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavBar;
