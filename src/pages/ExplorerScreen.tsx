import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";

const ExplorerScreen = () => (
  <div className="flex min-h-screen flex-col">
    <header
      className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
      style={{
        background: "rgba(255,255,255,0.72)",
        backdropFilter: "blur(20px) saturate(1.5)",
        WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        borderBottom: "1px solid rgba(255,255,255,0.6)",
        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
      }}
    >
      <h1 className="text-xl font-serif font-semibold text-foreground">Explorer</h1>
      <ProfileAvatar />
    </header>
    <main
      className="flex-1 overflow-y-auto px-4"
      style={{ paddingBottom: 100, scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Content will be added here */}
    </main>
    <style>{`main::-webkit-scrollbar { display: none; }`}</style>
    <BottomNavBar />
  </div>
);

export default ExplorerScreen;
