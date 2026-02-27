import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";

const ExplorerScreen = () => (
  <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
    <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ backgroundColor: "#F4F1EA" }}>
      <h1 className="text-xl font-semibold" style={{ fontFamily: "'Crimson Text', Georgia, serif", color: "#2A2A2A" }}>
        Explorer
      </h1>
      <ProfileAvatar />
    </header>
    <main className="flex-1 flex flex-col items-center justify-center px-4 text-center" style={{ gap: 12, paddingBottom: 80 }}>
      <span className="text-4xl">🌿</span>
      <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#8B7D8B" }}>
        Bientôt disponible
      </p>
    </main>
    <BottomNavBar />
  </div>
);

export default ExplorerScreen;
