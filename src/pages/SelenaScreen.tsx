import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";

const SelenaScreen = () => {
  const prenom = useEnfantPrenom();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: "#1E1A1A", letterSpacing: -0.5 }}>{prenom || "Enfant"}</h1>
        <ProfileAvatar />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center gap-3 pb-20">
        <span className="text-4xl">🌿</span>
        <p className="text-[15px] font-sans text-muted-foreground">Bientôt disponible</p>
      </main>
      <BottomNavBar />
    </div>
  );
};

export default SelenaScreen;
