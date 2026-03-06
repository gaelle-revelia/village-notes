import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// ── Types & Presets ──────────────────────────────────────────────

interface Preset {
  label: string;
  subtitle: string;
  inhale: number;
  hold: number;
  exhale: number;
}

const PRESETS: Preset[] = [
  { label: "5 · 5", subtitle: "Équilibre classique", inhale: 5, hold: 0, exhale: 5 },
  { label: "4 · 6", subtitle: "Apaisement rapide", inhale: 4, hold: 0, exhale: 6 },
  { label: "4 · 7 · 8", subtitle: "Anti-stress profond", inhale: 4, hold: 7, exhale: 8 },
];

const DURATIONS = [3, 5, 10]; // minutes

const PHASE_COLORS = ["#E8736A", "#8B74E0", "#44A882"] as const; // inhale, hold, exhale
const PHASE_LABELS = ["Inspirez", "Retenez", "Expirez"] as const;

// ── Styles ───────────────────────────────────────────────────────

const glassBack: React.CSSProperties = {
  background: "rgba(255,255,255,0.42)",
  backdropFilter: "blur(14px) saturate(1.6)",
  WebkitBackdropFilter: "blur(14px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.7)",
};

const headerGlass: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

// ── Component ────────────────────────────────────────────────────

const OutilsCoherence: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [presetIdx, setPresetIdx] = useState(0);
  const [durationMin, setDurationMin] = useState(5);
  const [running, setRunning] = useState(false);
  const [paused, setPaused] = useState(false);
  const [done, setDone] = useState(false);

  // Animation state updated via rAF
  const [phase, setPhase] = useState(0); // 0 inhale, 1 hold, 2 exhale
  const [phaseProgress, setPhaseProgress] = useState(0); // 0→1
  const [elapsed, setElapsed] = useState(0); // seconds
  const [cycles, setCycles] = useState(0);

  const rafRef = useRef<number>(0);
  const startRef = useRef(0);
  const pausedAtRef = useRef(0);
  const stateRef = useRef({ phase: 0, phaseStart: 0, cycles: 0, elapsed: 0 });

  const preset = PRESETS[presetIdx];
  const totalDuration = durationMin * 60;

  const phaseDuration = useCallback(
    (p: number) => {
      if (p === 0) return preset.inhale;
      if (p === 1) return preset.hold;
      return preset.exhale;
    },
    [preset]
  );

  const nextPhase = useCallback(
    (current: number): number => {
      if (current === 0) return preset.hold > 0 ? 1 : 2;
      if (current === 1) return 2;
      return 0; // exhale → inhale (new cycle)
    },
    [preset]
  );

  const tick = useCallback(
    (now: number) => {
      const s = stateRef.current;
      const elapsedTotal = (now - startRef.current) / 1000;

      if (elapsedTotal >= totalDuration) {
        // Done
        setElapsed(totalDuration);
        setRunning(false);
        setPaused(false);
        setDone(true);
        setCycles(s.cycles);
        return;
      }

      s.elapsed = elapsedTotal;
      setElapsed(elapsedTotal);

      const phaseElapsed = (now - s.phaseStart) / 1000;
      const dur = phaseDuration(s.phase);
      const progress = Math.min(phaseElapsed / dur, 1);
      setPhaseProgress(progress);
      setPhase(s.phase);

      if (phaseElapsed >= dur) {
        const np = nextPhase(s.phase);
        if (s.phase === 2 && np === 0) {
          s.cycles += 1;
          setCycles(s.cycles);
        }
        s.phase = np;
        s.phaseStart = now;
      }

      rafRef.current = requestAnimationFrame(tick);
    },
    [totalDuration, phaseDuration, nextPhase]
  );

  const start = useCallback(() => {
    const now = performance.now();
    startRef.current = now;
    stateRef.current = { phase: 0, phaseStart: now, cycles: 0, elapsed: 0 };
    setPhase(0);
    setPhaseProgress(0);
    setElapsed(0);
    setCycles(0);
    setDone(false);
    setRunning(true);
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const pause = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    pausedAtRef.current = performance.now();
    setPaused(true);
  }, []);

  const resume = useCallback(() => {
    const pauseDelta = performance.now() - pausedAtRef.current;
    startRef.current += pauseDelta;
    stateRef.current.phaseStart += pauseDelta;
    setPaused(false);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const reset = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setRunning(false);
    setPaused(false);
    setDone(false);
    setPhase(0);
    setPhaseProgress(0);
    setElapsed(0);
    setCycles(0);
  }, []);

  useEffect(() => {
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  // ── Computed values ──
  const orbScale = (() => {
    if (!running && !done) return 0.86;
    if (phase === 0) return 0.72 + 0.28 * phaseProgress; // inhale 0.72→1
    if (phase === 1) return 1.0; // hold
    return 1.0 - 0.28 * phaseProgress; // exhale 1→0.72
  })();

  const haloScale = orbScale * 1.12;
  const haloOpacity = phase === 0 ? 0.25 + 0.35 * phaseProgress : phase === 1 ? 0.6 : 0.6 - 0.35 * phaseProgress;

  const progressRingRadius = 122;
  const circumference = 2 * Math.PI * progressRingRadius;
  const strokeDash = running ? circumference * phaseProgress : 0;

  const currentColor = running ? PHASE_COLORS[phase] : "#9A9490";
  const currentLabel = running ? PHASE_LABELS[phase] : "Prêt";

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  };

  // ── Done screen ──
  if (done) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}
      >
        {/* Header */}
        <Header onBack={() => navigate("/outils")} />

        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8 gap-6">
          {/* Badge */}
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(68,168,130,0.25), rgba(139,116,224,0.25))",
              border: "2px solid #44A882",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 32,
            }}
          >
            ✦
          </div>

          <h2
            style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: 24, color: "#1E1A1A" }}
          >
            Séance terminée
          </h2>

          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9A9490" }}>
            {formatTime(elapsed)} de respiration guidée
          </p>

          {/* Stats */}
          <div className="flex gap-3 w-full max-w-xs">
            <StatPill label="Cycles" value={String(cycles)} />
            <StatPill label="Durée" value={formatTime(elapsed)} />
            <StatPill label="Rythme" value={preset.label} />
          </div>

          {/* CTA */}
          <button
            onClick={reset}
            className="w-full max-w-xs py-3.5"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              color: "white",
              borderRadius: 18,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 600,
              fontSize: 16,
              boxShadow: "0 6px 20px rgba(139,116,224,0.35)",
              border: "none",
            }}
          >
            Nouvelle séance
          </button>
        </div>
      </div>
    );
  }

  // ── Main screen ──
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}
    >
      <Header onBack={() => navigate("/outils")} />

      <div className="flex-1 flex flex-col items-center px-6 pt-4 pb-8 gap-5">
        {/* ── Orb zone ── */}
        <div className="relative flex items-center justify-center" style={{ width: 260, height: 260 }}>
          {/* Halo */}
          <div
            style={{
              position: "absolute",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(139,116,224,0.18) 0%, transparent 70%)",
              transform: `scale(${haloScale})`,
              opacity: running ? haloOpacity : 0.2,
              transition: "opacity 0.3s",
            }}
          />

          {/* SVG progress ring */}
          <svg
            width={260}
            height={260}
            style={{ position: "absolute", transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle
              cx={130}
              cy={130}
              r={progressRingRadius}
              fill="none"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth={3}
            />
            {/* Progress */}
            <circle
              cx={130}
              cy={130}
              r={progressRingRadius}
              fill="none"
              stroke={running ? PHASE_COLORS[phase] : "rgba(255,255,255,0.3)"}
              strokeWidth={3.5}
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circumference - strokeDash}`}
              style={{ transition: "stroke 0.3s" }}
            />
          </svg>

          {/* Orb */}
          <div
            style={{
              width: 160,
              height: 160,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 40% 35%, rgba(255,255,255,0.82), rgba(232,115,106,0.22) 50%, rgba(139,116,224,0.38))",
              backdropFilter: "blur(12px) saturate(1.8)",
              WebkitBackdropFilter: "blur(12px) saturate(1.8)",
              border: "1.5px solid rgba(255,255,255,0.88)",
              boxShadow: `0 0 ${running && phase === 0 ? 40 + phaseProgress * 30 : 40}px rgba(139,116,224,${running && phase === 0 ? 0.2 + phaseProgress * 0.25 : 0.2}), inset 0 1px 0 rgba(255,255,255,0.9)`,
              transform: `scale(${orbScale})`,
              willChange: "transform",
            }}
          />
        </div>

        {/* ── Phase label ── */}
        <div className="text-center">
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: 28,
              color: currentColor,
              transition: "color 0.3s",
            }}
          >
            {currentLabel}
          </p>
        </div>

        {/* ── Session progress bar ── */}
        <div
          className="w-full max-w-xs overflow-hidden"
          style={{ height: 4, borderRadius: 2, background: "rgba(255,255,255,0.4)" }}
        >
          <div
            style={{
              height: "100%",
              width: `${(elapsed / totalDuration) * 100}%`,
              background: "linear-gradient(90deg, #E8736A, #8B74E0)",
              borderRadius: 2,
              transition: "width 0.3s linear",
            }}
          />
        </div>

        {/* ── Stats row ── */}
        <div className="flex gap-3 w-full max-w-xs">
          <StatPill label="Cycles" value={String(cycles)} />
          <StatPill label="Temps" value={formatTime(elapsed)} />
          <StatPill label="Rythme" value={preset.label} />
        </div>

        {/* ── Presets (when not running) ── */}
        {!running && (
          <>
            <div className="w-full max-w-xs">
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#9A9490",
                  marginBottom: 8,
                }}
              >
                Rythme
              </p>
              <div className="flex gap-2">
                {PRESETS.map((p, i) => (
                  <ChipButton
                    key={p.label}
                    label={p.label}
                    subtitle={p.subtitle}
                    active={i === presetIdx}
                    onClick={() => setPresetIdx(i)}
                  />
                ))}
              </div>
            </div>

            <div className="w-full max-w-xs">
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: "#9A9490",
                  marginBottom: 8,
                }}
              >
                Durée
              </p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <ChipButton
                    key={d}
                    label={`${d} min`}
                    active={d === durationMin}
                    onClick={() => setDurationMin(d)}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* ── CTA ── */}
        <div className="w-full max-w-xs mt-auto pt-4">
          {!running ? (
            <button
              onClick={start}
              className="w-full py-3.5"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                color: "white",
                borderRadius: 18,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 600,
                fontSize: 16,
                boxShadow: "0 6px 20px rgba(139,116,224,0.35)",
                border: "none",
              }}
            >
              Commencer la séance
            </button>
          ) : (
            <button
              onClick={paused ? resume : pause}
              className="w-full py-3.5"
              style={{
                ...glassBack,
                borderRadius: 18,
                fontFamily: "'DM Sans', sans-serif",
                fontWeight: 500,
                fontSize: 16,
                color: "#9A9490",
              }}
            >
              {paused ? "Reprendre" : "Pause"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Sub-components ───────────────────────────────────────────────

const Header: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div
    className="sticky top-0 z-20 px-4 py-3 flex items-start gap-3"
    style={{
      background: "rgba(255,255,255,0.72)",
      backdropFilter: "blur(20px) saturate(1.5)",
      WebkitBackdropFilter: "blur(20px) saturate(1.5)",
      borderBottom: "1px solid rgba(255,255,255,0.6)",
      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
    }}
  >
    <button
      onClick={onBack}
      style={{
        ...{
          background: "rgba(255,255,255,0.42)",
          backdropFilter: "blur(14px) saturate(1.6)",
          WebkitBackdropFilter: "blur(14px) saturate(1.6)",
          border: "1px solid rgba(255,255,255,0.7)",
        },
        borderRadius: 12,
        width: 36,
        height: 36,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginTop: 2,
      }}
    >
      <ChevronLeft size={20} color="#1E1A1A" />
    </button>

    <div className="flex-1 min-w-0">
      <h1
        style={{
          fontFamily: "'Fraunces', serif",
          fontWeight: 600,
          fontSize: 20,
          color: "#1E1A1A",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        Cohérence cardiaque
      </h1>
      <p
        style={{
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 400,
          fontSize: 12,
          color: "#9A9490",
          margin: 0,
        }}
      >
        Outil bien-être · The Village
      </p>
    </div>

    <span
      style={{
        background: "rgba(232,164,74,0.15)",
        borderRadius: 12,
        padding: "4px 8px",
        fontSize: 18,
        lineHeight: 1,
        flexShrink: 0,
      }}
    >
      🫁
    </span>
  </div>
);

const StatPill: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div
    className="flex-1 text-center py-2 px-1"
    style={{
      background: "rgba(255,255,255,0.38)",
      backdropFilter: "blur(16px) saturate(1.6)",
      WebkitBackdropFilter: "blur(16px) saturate(1.6)",
      border: "1px solid rgba(255,255,255,0.85)",
      borderRadius: 14,
      boxShadow: "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
    }}
  >
    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A" }}>
      {value}
    </p>
    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, color: "#9A9490" }}>{label}</p>
  </div>
);

const ChipButton: React.FC<{
  label: string;
  subtitle?: string;
  active: boolean;
  onClick: () => void;
}> = ({ label, subtitle, active, onClick }) => (
  <button
    onClick={onClick}
    className="flex-1 py-2 px-2 text-center"
    style={{
      background: active
        ? "linear-gradient(135deg, rgba(232,115,106,0.15), rgba(139,116,224,0.18))"
        : "rgba(255,255,255,0.42)",
      backdropFilter: "blur(14px) saturate(1.6)",
      WebkitBackdropFilter: "blur(14px) saturate(1.6)",
      border: active ? "1px solid rgba(139,116,224,0.4)" : "1px solid rgba(255,255,255,0.7)",
      borderRadius: 14,
    }}
  >
    <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 600, color: "#1E1A1A" }}>
      {label}
    </p>
    {subtitle && (
      <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, color: "#9A9490", marginTop: 1 }}>
        {subtitle}
      </p>
    )}
  </button>
);

export default OutilsCoherence;
