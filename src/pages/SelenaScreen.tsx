import { useEffect, useState } from "react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import CarteProgressionOnboarding from "@/components/progression/CarteProgressionOnboarding";

const SelenaScreen = () => {
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const [showCarteOnboarding, setShowCarteOnboarding] = useState(false);
  const [checkingAxes, setCheckingAxes] = useState(true);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("axes_developpement")
      .select("id", { count: "exact", head: true })
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .then(({ count }) => {
        if (count === 0) setShowCarteOnboarding(true);
        setCheckingAxes(false);
      });
  }, [enfantId]);

  const hasAxes = !checkingAxes && !showCarteOnboarding;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: "#1E1A1A", letterSpacing: -0.5 }}>{prenom || "Enfant"}</h1>
        <ProfileAvatar />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3 pb-20">
        {hasAxes && (
          /* Carte de Progression view — to be built in next prompt */
          null
        )}
      </main>
      <BottomNavBar />

      {!checkingAxes && showCarteOnboarding && enfantId && prenom && (
        <CarteProgressionOnboarding
          enfantId={enfantId}
          prenom={prenom}
          onComplete={() => setShowCarteOnboarding(false)}
        />
      )}
    </div>
  );
};

export default SelenaScreen;
