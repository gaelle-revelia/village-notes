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
        height: 64,
        backgroundColor: "#FFFFFF",
        borderTop: "1px solid #E8E3DB",
        boxShadow: "0 -2px 8px rgba(42,42,42,0.04)",
      }}
    >
      {tabs.map((tab) => {
        const active = location.pathname === tab.path;
        const color = active ? "#6B8CAE" : "#A8A0A8";
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className="flex flex-col items-center justify-center flex-1 h-full"
            style={{ background: "none", border: "none" }}
          >
            <tab.icon size={22} color={color} />
            <span
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 11,
                fontWeight: active ? 600 : 400,
                color,
                marginTop: 2,
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
