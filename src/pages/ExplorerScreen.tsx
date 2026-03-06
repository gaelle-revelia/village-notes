import { useState } from "react";
import BottomNavBar from "@/components/BottomNavBar";
import { Bookmark, Search, Activity, Brain, Mic, HeartPulse, ChevronRight } from "lucide-react";

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

      {/* À la une */}
      <div style={{ marginTop: 24 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: "#1E1A1A", padding: "0 24px", marginBottom: 12 }}>
          À la une
        </h2>
        <div
          className="flex gap-3 overflow-x-auto"
          style={{ padding: "0 24px", scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {FEATURED.map((card) => (
            <div
              key={card.titre}
              className="shrink-0 relative overflow-hidden flex flex-col justify-end"
              style={{ width: 200, height: 240, borderRadius: 20, background: card.bg }}
            >
              {/* Decorative circles */}
              {card.circles.map((c, i) => (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    width: c.size, height: c.size,
                    background: "rgba(255,255,255,0.17)",
                    top: "top" in c ? c.top : undefined,
                    bottom: "bottom" in c ? c.bottom : undefined,
                    left: "left" in c ? c.left : undefined,
                    right: "right" in c ? c.right : undefined,
                  }}
                />
              ))}
              {/* Dark overlay */}
              <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.45) 100%)" }} />
              {/* Content */}
              <div className="relative z-10 p-4 flex flex-col gap-2">
                <span
                  style={{
                    alignSelf: "flex-start",
                    background: "rgba(255,255,255,0.25)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: 10,
                    padding: "3px 8px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "#fff",
                    textTransform: "uppercase",
                    letterSpacing: 0.5,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {card.domaine}
                </span>
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#fff", lineHeight: 1.25 }}>
                  {card.titre}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Par domaine */}
      <div style={{ marginTop: 28 }}>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 20, color: "#1E1A1A", padding: "0 24px", marginBottom: 12 }}>
          Par domaine
        </h2>
        <div className="grid grid-cols-2 gap-3" style={{ padding: "0 24px" }}>
          {[
            { nom: "Moteur & physique", couleur: "#E8736A", count: "12 ressources" },
            { nom: "Cognitif & psychomoteur", couleur: "#8B74E0", count: "9 ressources" },
            { nom: "Sensoriel & communication", couleur: "#44A882", count: "14 ressources" },
            { nom: "Bien-être & émotionnel", couleur: "#E8A44A", count: "8 ressources" },
            { nom: "Médical & administratif", couleur: "#8A9BAE", count: "11 ressources" },
            { nom: "Témoignages de parents", couleur: "#8B74E0", count: "7 histoires" },
          ].map((d) => (
            <div
              key={d.nom}
              className="relative overflow-hidden flex flex-col"
              style={{
                background: "rgba(255,255,255,0.38)",
                backdropFilter: "blur(16px) saturate(1.6)",
                WebkitBackdropFilter: "blur(16px) saturate(1.6)",
                border: "1px solid rgba(255,255,255,0.85)",
                borderRadius: 18,
                boxShadow: "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
                padding: "18px 14px",
                minHeight: 100,
              }}
            >
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: d.couleur, marginBottom: 10 }} />
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1E1A1A", lineHeight: 1.3 }}>
                {d.nom}
              </span>
              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#9A9490", marginTop: 4 }}>
                {d.count}
              </span>
              {/* Decorative circle */}
              <div
                className="absolute"
                style={{ width: 50, height: 50, borderRadius: "50%", background: d.couleur, opacity: 0.12, bottom: -10, right: -10 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
    <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    <BottomNavBar />
  </div>
  );
};

export default ExplorerScreen;
