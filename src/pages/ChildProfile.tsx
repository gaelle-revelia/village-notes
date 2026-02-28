import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export default function ChildProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("enfants")
      .select("prenom")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPrenom(data.prenom);
      });
  }, [user]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/timeline")} className="flex items-center gap-1 text-sm font-sans text-primary">
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <h2 className="text-2xl font-serif font-semibold text-foreground">Profil de {prenom || "mon enfant"}</h2>
        <p className="text-sm font-sans text-muted-foreground">Bientôt disponible</p>
      </main>
    </div>
  );
}
