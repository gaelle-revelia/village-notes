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
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      <header className="flex items-center gap-3 px-4 py-3">
        <button
          onClick={() => navigate("/timeline")}
          className="flex items-center gap-1"
          style={{ color: "#6B8CAE", fontFamily: "Inter, sans-serif", fontSize: 14 }}
        >
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
        <h2
          className="text-2xl font-semibold"
          style={{ fontFamily: "'Crimson Text', Georgia, serif", color: "#2A2A2A" }}
        >
          Profil de {prenom || "mon enfant"}
        </h2>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B" }}>
          Bientôt disponible
        </p>
      </main>
    </div>
  );
}
