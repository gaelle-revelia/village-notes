import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { supabase } from "@/integrations/supabase/client";
import { User, Users, BookOpen, Heart, Settings, ChevronRight, LogOut, X } from "lucide-react";

export function ProfileAvatar() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();

  // Animate in after mount, animate out before unmount
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => setVisible(true));
    }
  }, [open]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => setOpen(false), 300);
  };

  const menuRows = [
    { icon: User, label: "Mon profil", desc: "Modifier mes informations", route: "/profil" },
    { icon: Users, label: "Mon village", desc: "Gérer les intervenants", route: "/village" },
    { icon: BookOpen, label: "Mon vocabulaire", desc: "Mots et lieux reconnus à la voix", route: "/vocabulaire" },
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

      {open && createPortal(
        <div className="fixed inset-0 z-50">
          {/* Overlay */}
          <div
            className="absolute inset-0 transition-opacity duration-300"
            style={{ background: "rgba(0,0,0,0.3)", opacity: visible ? 1 : 0 }}
            onClick={handleClose}
          />

          {/* Side panel */}
          <div
            className="absolute top-0 right-0 h-full flex flex-col transition-transform duration-300 ease-out"
            style={{
              width: "50%",
              minWidth: 260,
              maxWidth: 360,
              transform: visible ? "translateX(0)" : "translateX(100%)",
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(20px) saturate(1.5)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.65)",
              boxShadow: "-4px 0 24px rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-2">
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#9A9490" }}>
                Menu
              </span>
              <button
                onClick={handleClose}
                className="flex items-center justify-center rounded-full transition-colors hover:bg-black/5"
                style={{ width: 30, height: 30 }}
                aria-label="Fermer"
              >
                <X size={18} style={{ color: "#9A9490" }} />
              </button>
            </div>

            {/* Email */}
            <div className="px-4 pb-3 border-b" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <span className="text-xs" style={{ color: "#9A9490" }}>
                {user?.email || ""}
              </span>
            </div>

            {/* Menu items */}
            <nav className="flex-1 overflow-y-auto py-2">
              {menuRows.map((item) => (
                <button
                  key={item.route}
                  onClick={() => { handleClose(); setTimeout(() => navigate(item.route), 300); }}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-black/[0.03]"
                >
                  <item.icon size={18} style={{ color: "#8B74E0" }} className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold" style={{ color: "#1E1A1A" }}>{item.label}</p>
                    <p className="text-xs" style={{ color: "#9A9490" }}>{item.desc}</p>
                  </div>
                  <ChevronRight size={16} style={{ color: "#9A9490" }} className="shrink-0" />
                </button>
              ))}
            </nav>

            {/* Logout */}
            <div className="border-t px-4 py-3" style={{ borderColor: "rgba(0,0,0,0.06)" }}>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  navigate("/auth");
                }}
                className="flex w-full items-center gap-3 text-left transition-colors hover:bg-black/[0.03] rounded-lg px-1 py-2"
              >
                <LogOut size={18} className="text-destructive shrink-0" />
                <span className="text-sm font-semibold text-destructive">
                  Se déconnecter
                </span>
              </button>
            </div>

            {/* Safe area spacer */}
            <div className="h-4" />
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
