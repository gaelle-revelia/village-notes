import { useState } from "react";
import BottomNavBar from "@/components/BottomNavBar";
import { Bookmark, Search } from "lucide-react";

const FILTERS = [
  { label: "Tout", bg: "linear-gradient(135deg, #E8736A, #8B74E0)" },
  { label: "Moteur", bg: "#E8736A" },
  { label: "Cognitif", bg: "#8B74E0" },
  { label: "Sensoriel", bg: "#44A882" },
  { label: "Bien-être", bg: "#E8A44A" },
  { label: "Médical", bg: "#8A9BAE" },
] as const;

const FEATURED = [
  { domaine: "Moteur", bg: "linear-gradient(145deg, #F0907A, #E8736A, #C8564E)", titre: "La kiné à la maison, les bons réflexes", circles: [{ top: -20, right: -10, size: 80 }, { bottom: 40, left: -25, size: 60 }] },
  { domaine: "Cognitif", bg: "linear-gradient(145deg, #A08AEA, #8B74E0, #6A54C0)", titre: "Comprendre les bilans neuropsychologiques", circles: [{ top: 10, right: 20, size: 70 }, { bottom: 60, left: 10, size: 50 }] },
  { domaine: "Sensoriel", bg: "linear-gradient(145deg, #5EC09A, #44A882, #2E8862)", titre: "Intégration sensorielle : par où commencer ?", circles: [{ top: -15, left: 30, size: 90 }, { bottom: 30, right: -20, size: 55 }] },
  { domaine: "Bien-être", bg: "linear-gradient(145deg, #F0B85A, #E8A44A, #C8842A)", titre: "Prendre soin de soi pour mieux prendre soin", circles: [{ top: 5, right: -15, size: 75 }, { bottom: 50, left: -10, size: 65 }] },
] as const;

const ExplorerScreen = () => {
  const [activeFilter, setActiveFilter] = useState("Tout");

  return (
  <div className="flex min-h-screen flex-col">
    <div
      className="overflow-y-auto flex-1"
      style={{ paddingBottom: 100, scrollbarWidth: "none", msOverflowStyle: "none" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between" style={{ padding: "24px 24px 0" }}>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 700,
            fontSize: 30,
            color: "#1E1A1A",
          }}
        >
          Explorer
        </h1>
        <button
          className="flex items-center gap-1.5"
          style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.8)",
            borderRadius: 20,
            padding: "7px 14px",
            fontSize: 13,
            fontFamily: "'DM Sans', sans-serif",
            fontWeight: 500,
            color: "#1E1A1A",
            cursor: "default",
          }}
        >
          <Bookmark size={14} />
          Mes favoris
        </button>
      </div>

      {/* Search bar */}
      <div style={{ padding: "16px 24px 0" }}>
        <div
          className="flex items-center gap-3"
          style={{
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(12px) saturate(1.4)",
            WebkitBackdropFilter: "blur(12px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.65)",
            borderRadius: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            padding: "12px 16px",
          }}
        >
          <Search size={18} color="#9A9490" />
          <input
            type="text"
            placeholder="Rechercher une ressource…"
            readOnly
            className="flex-1 bg-transparent outline-none border-none"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#1E1A1A",
            }}
          />
        </div>
      </div>

      {/* Filter chips */}
      <div
        className="flex gap-2 overflow-x-auto"
        style={{ padding: "16px 24px 0", scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {FILTERS.map((f) => {
          const active = activeFilter === f.label;
          return (
            <button
              key={f.label}
              onClick={() => setActiveFilter(f.label)}
              className="shrink-0"
              style={{
                background: active ? f.bg : "rgba(255,255,255,0.5)",
                backdropFilter: active ? "none" : "blur(8px)",
                WebkitBackdropFilter: active ? "none" : "blur(8px)",
                border: active ? "none" : "1.5px solid rgba(255,255,255,0.8)",
                borderRadius: 20,
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
                color: active ? "#fff" : "#9A9490",
                outline: "none",
                cursor: "pointer",
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Content will be added here */}
    </div>
    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    <BottomNavBar />
  </div>
  );
};

export default ExplorerScreen;
