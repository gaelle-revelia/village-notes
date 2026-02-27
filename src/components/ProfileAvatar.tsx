import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, Heart, Settings, ChevronRight, LogOut } from "lucide-react";

export function ProfileAvatar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();

  const menuRows = [
    { icon: User, label: "Mon profil", desc: "Modifier mes informations", route: "/profil" },
    { icon: Users, label: "Mon village", desc: "Gérer les intervenants", route: "/village" },
    { icon: Heart, label: `Profil de ${prenom || "mon enfant"}`, desc: "Modifier le profil de mon enfant", route: "/enfant" },
    { icon: Settings, label: "Paramètres", desc: "Notifications, confidentialité", route: "/parametres" },
  ];

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center shrink-0"
        style={{
          width: 32,
          height: 32,
          borderRadius: "50%",
          backgroundColor: "#6B8CAE",
          border: "none",
          fontFamily: "Inter, sans-serif",
          fontSize: 13,
          fontWeight: 600,
          color: "#FFFFFF",
        }}
        aria-label="Menu profil"
      >
        {user?.email?.[0]?.toUpperCase() || "?"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              backgroundColor: "#FFFFFF",
              borderRadius: "16px 16px 0 0",
              boxShadow: "0 -2px 16px rgba(42,42,42,0.08)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "#E8E3DB" }} />
            </div>

            <div style={{ padding: 16, borderBottom: "1px solid #E8E3DB" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7D8B" }}>
                {user?.email || ""}
              </span>
            </div>

            <nav className="py-1">
              {menuRows.map((item) => (
                <button
                  key={item.route}
                  onClick={() => { setOpen(false); navigate(item.route); }}
                  className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted transition-colors"
                  style={{ minHeight: 44 }}
                >
                  <item.icon size={20} style={{ color: "#6B8CAE", flexShrink: 0 }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#2A2A2A" }}>{item.label}</p>
                    <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7D8B" }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={18} style={{ color: "#8B7D8B", flexShrink: 0 }} />
                </button>
              ))}
            </nav>

            <div style={{ borderTop: "1px solid #E8E3DB" }}>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted transition-colors"
                style={{ minHeight: 44 }}
              >
                <LogOut size={20} style={{ color: "#C4626B", flexShrink: 0 }} />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 600, color: "#C4626B" }}>
                  Se déconnecter
                </span>
              </button>
            </div>
            <div style={{ height: 16 }} />
          </div>
        </div>
      )}
    </>
  );
}
