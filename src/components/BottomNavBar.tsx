import { useLocation, useNavigate } from "react-router-dom";
import { Home, Heart, Wrench, Compass } from "lucide-react";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";

const BottomNavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();

  const tabs = [
    { icon: Home, label: "Accueil", path: "/timeline" },
    { icon: Heart, label: prenom || "Enfant", path: "/selena" },
    { icon: Wrench, label: "Outils", path: "/outils" },
    { icon: Compass, label: "Explorer", path: "/explorer" },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around"
      style={{
        height: 60,
        background: "rgba(255, 255, 255, 0.55)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderTop: "1px solid rgba(255, 255, 255, 0.65)",
        boxShadow: "0 -2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center flex-1 h-full border-none bg-transparent"
          >
            <tab.icon
              size={22}
              style={{ color: active ? "#E8736A" : "#8A9BAE" }}
            />
            <span
              className="text-[10px] mt-0.5"
              style={{
                fontWeight: active ? 600 : 400,
                color: active ? "#E8736A" : "#8A9BAE",
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
