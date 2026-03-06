import { ChevronRight } from "lucide-react";

interface Pepite {
  id: string;
  created_at: string;
}

interface AxeCardProps {
  axe: { id: string; label: string; couleur: string; ordre: number };
  pepites: Pepite[];
  onClick: (id: string) => void;
}

// Simple deterministic hash from string → 0..1
function hashToFloat(str: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return (((h >>> 0) % 10000) / 10000);
}

const AxeCard = ({ axe, pepites, onClick }: AxeCardProps) => {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // Compute recency factor 0..1 (1 = most recent)
  const pepitesWithRecency = pepites.map((p) => {
    const age = now - new Date(p.created_at).getTime();
    const recency = Math.max(0, 1 - age / (thirtyDaysMs * 6)); // 6 months scale
    return { ...p, recency };
  });

  return (
    <div
      onClick={() => onClick(axe.id)}
      className="cursor-pointer transition-transform active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.38)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.85)",
        borderLeft: `3px solid ${axe.couleur}`,
        borderRadius: 18,
        boxShadow: "0 4px 20px rgba(139,116,224,0.07)",
        padding: "14px 16px 10px",
      }}
    >
      {/* Top row */}
      <div className="flex items-center gap-2">
        <span
          className="shrink-0 rounded-full"
          style={{ width: 8, height: 8, background: axe.couleur }}
        />
        <span
          className="flex-1 truncate"
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 15,
            fontWeight: 600,
            color: "#1E1A1A",
          }}
        >
          {axe.label}
        </span>
        <ChevronRight size={16} color="#9A9490" />
      </div>

      {/* Mini constellation */}
      <svg
        width="100%"
        height={52}
        className="mt-2"
        style={{ display: "block" }}
      >
        {pepitesWithRecency.length > 0 ? (
          pepitesWithRecency.map((p, i) => {
            const cx = hashToFloat(p.id, 1) * 90 + 5; // 5%–95%
            const cy = hashToFloat(p.id, 2) * 36 + 8; // 8–44px
            const r = 3 + p.recency * 3; // 3–6px
            const opacity = 0.4 + p.recency * 0.45; // 0.40–0.85
            const dur = 2.5 + hashToFloat(p.id, 3) * 2.5; // 2.5–5s
            const delay = hashToFloat(p.id, 4); // 0–1s

            return (
              <circle
                key={p.id}
                cx={`${cx}%`}
                cy={cy}
                r={r}
                fill={axe.couleur}
                style={{
                  opacity,
                  animation: `axePulse ${dur}s ${delay}s ease-in-out infinite alternate`,
                }}
              />
            );
          })
        ) : (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={i}
                cx={`${15 + i * 17}%`}
                cy={22}
                r={4}
                fill="none"
                stroke={axe.couleur}
                strokeWidth={1}
                strokeDasharray="3 2"
                opacity={0.35}
              />
            ))}
          </>
        )}
      </svg>

      {pepites.length === 0 && (
        <p
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            color: "#9A9490",
            fontStyle: "italic",
            textAlign: "center",
            marginTop: -2,
            marginBottom: 2,
          }}
        >
          Les pépites arrivent au fil des notes
        </p>
      )}
    </div>
  );
};

export default AxeCard;
