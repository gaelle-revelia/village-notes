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
        className="flex items-center justify-center shrink-0 border-none text-sm font-semibold text-white"
        style={{
          width: 34,
          height: 34,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: "0 3px 12px rgba(139,116,224,0.35)",
        }}
        aria-label="Menu profil"
      >
        {user?.email?.[0]?.toUpperCase() || "?"}
      </button>

      {open && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0"
            style={{
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px) saturate(1.5)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              borderRadius: "16px 16px 0 0",
              boxShadow: "0 -2px 16px rgba(0,0,0,0.08)",
            }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="bg-border" style={{ width: 36, height: 4, borderRadius: 2 }} />
            </div>

            <div className="px-4 py-3 border-b border-border">
              <span className="text-sm text-muted-foreground">
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
                  <item.icon size={20} className="text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <ChevronRight size={18} className="text-muted-foreground shrink-0" />
                </button>
              ))}
            </nav>

            <div className="border-t border-border">
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
                className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-muted transition-colors"
                style={{ minHeight: 44 }}
              >
                <LogOut size={20} className="text-destructive shrink-0" />
                <span className="text-sm font-semibold text-destructive">
                  Se déconnecter
                </span>
              </button>
            </div>
            <div className="h-4" />
          </div>
        </div>
      )}
    </>
  );
}
