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

const REF_WIDTH = 300; // reference width for collision math
const MIN_DIST = 16;

function placeCircles(
  pepitesWithRecency: { id: string; recency: number }[]
): { id: string; cx: number; cy: number; r: number; opacity: number; dur: number; delay: number }[] {
  const placed: { cx: number; cy: number; r: number }[] = [];
  const result: { id: string; cx: number; cy: number; r: number; opacity: number; dur: number; delay: number }[] = [];

  for (const p of pepitesWithRecency) {
    const r = 3 + p.recency * 3;
    const initCxPct = hashToFloat(p.id, 1) * 90 + 5;
    const initCx = (initCxPct / 100) * REF_WIDTH;
    const initCy = hashToFloat(p.id, 2) * 116 + 8; // 8–124px for 140px height

    let bestCx = initCx;
    let bestCy = initCy;
    let found = !placed.some(
      (c) => Math.hypot(c.cx - bestCx, c.cy - bestCy) < MIN_DIST
    );

    if (!found) {
      for (let attempt = 0; attempt < 80 && !found; attempt++) {
        const angle = (attempt % 24) * 15 * (Math.PI / 180);
        const radius = 8 * (1 + Math.floor(attempt / 24));
        const candidateCx = initCx + Math.cos(angle) * radius;
        const candidateCy = initCy + Math.sin(angle) * radius;

        if (candidateCx < 5 || candidateCx > REF_WIDTH - 5 || candidateCy < 5 || candidateCy > 95) continue;

        if (!placed.some((c) => Math.hypot(c.cx - candidateCx, c.cy - candidateCy) < MIN_DIST)) {
          bestCx = candidateCx;
          bestCy = candidateCy;
          found = true;
        }
      }
    }

    if (!found) continue; // skip silently

    placed.push({ cx: bestCx, cy: bestCy, r });
    result.push({
      id: p.id,
      cx: (bestCx / REF_WIDTH) * 100,
      cy: bestCy,
      r,
      opacity: 0.4 + p.recency * 0.45,
      dur: 2.5 + hashToFloat(p.id, 3) * 2.5,
      delay: hashToFloat(p.id, 4),
    });
  }

  return result;
}

const AxeCard = ({ axe, pepites, onClick }: AxeCardProps) => {
  const now = Date.now();
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  const pepitesWithRecency = pepites.map((p) => {
    const age = now - new Date(p.created_at).getTime();
    const recency = Math.max(0, 1 - age / (thirtyDaysMs * 6));
    return { ...p, recency };
  });

  const circles = placeCircles(pepitesWithRecency);

  return (
    <div
      onClick={() => onClick(axe.id)}
      className="cursor-pointer transition-transform active:scale-[0.98]"
      style={{
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(16px) saturate(1.6)",
        WebkitBackdropFilter: "blur(16px) saturate(1.6)",
        border: `1px solid ${axe.couleur}40`,
        borderRadius: 18,
        boxShadow: "0 4px 20px rgba(139,116,224,0.07)",
        padding: "14px 16px 10px",
      }}
    >
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

      <svg
        width="100%"
        height={140}
        className="mt-2"
        style={{ display: "block" }}
      >
        {circles.length > 0 ? (
          circles.map((c) => {
            const dur = 2.5 + hashToFloat(c.id, 3) * 2.5;
            const delay = hashToFloat(c.id, 4) * 1.2;
            const baseOp = c.opacity;
            const dimOp = baseOp * 0.4;

            return (
              <circle
                key={c.id}
                cx={`${c.cx}%`}
                cy={c.cy}
                r={c.r}
                fill={axe.couleur}
                style={{
                  opacity: baseOp,
                  animation: `twinkle-${c.id.slice(0, 8)} ${dur}s ${delay}s ease-in-out infinite`,
                }}
              >
                <style>{`
                  @keyframes twinkle-${c.id.slice(0, 8)} {
                    0% { opacity: ${baseOp}; }
                    50% { opacity: ${dimOp}; }
                    100% { opacity: ${baseOp}; }
                  }
                `}</style>
              </circle>
            );
          })
        ) : (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <circle
                key={i}
                cx={`${15 + i * 17}%`}
                cy={45}
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
