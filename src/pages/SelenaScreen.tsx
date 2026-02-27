import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";

const SelenaScreen = () => {
  const prenom = useEnfantPrenom();

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      <main className="flex-1 flex flex-col items-center justify-center pb-16 px-4 text-center" style={{ gap: 12 }}>
        <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 24, color: "#2A2A2A" }}>
          {prenom || "Enfant"}
        </h2>
        <span className="text-4xl">🌿</span>
        <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#8B7D8B" }}>
          Bientôt disponible
        </p>
      </main>
      <BottomNavBar />
    </div>
  );
};

export default SelenaScreen;
