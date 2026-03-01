import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Pause, Play } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const DOMAIN_COLORS: Record<string, string> = {
  Moteur: "#E8736A",
  Cognitif: "#8B74E0",
  Sensoriel: "#44A882",
  "Bien-être": "#E8A44A",
  Médical: "#8A9BAE",
};

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const glassHeader: React.CSSProperties = {
  background: "rgba(255,255,255,0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid rgba(255,255,255,0.6)",
  boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
};

interface Activite {
  id: string;
  nom: string;
  domaine: string;
  track_temps: boolean | null;
  track_distance: boolean | null;
  unite_distance: string | null;
  icone: string | null;
}

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function OutilsActiviteChrono() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enfantId } = useEnfantId();

  const [activite, setActivite] = useState<Activite | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(true);
  const [showRecap, setShowRecap] = useState(false);
  const [distance, setDistance] = useState(0);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch activite
  useEffect(() => {
    if (!id) return;
    supabase
      .from("activites")
      .select("id, nom, domaine, track_temps, track_distance, unite_distance, icone")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setActivite(data as Activite);
      });
  }, [id]);

  // Timer
  useEffect(() => {
    if (running && !showRecap) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, showRecap]);

  const domainColor = activite ? DOMAIN_COLORS[activite.domaine] || "#8A9BAE" : "#8A9BAE";
  const unite = activite?.unite_distance || "m";

  const handleTerminer = () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setShowRecap(true);
  };

  const handleSave = async () => {
    if (!user || !enfantId || !activite) return;
    setSaving(true);

    const timeStr = formatTime(seconds);
    const distStr = activite.track_distance && distance > 0 ? ` / ${distance} ${unite}` : "";
    const rawText = `${activite.nom} — ${timeStr}${distStr}`;

    try {
      await Promise.all([
        supabase.from("sessions_activite").insert({
          activite_id: activite.id,
          enfant_id: enfantId,
          duree_secondes: seconds,
          distance: activite.track_distance ? distance : null,
          notes: notes || null,
        } as any),
        supabase.from("memos").insert({
          type: "activite",
          user_id: user.id,
          enfant_id: enfantId,
          memo_date: new Date().toISOString().slice(0, 10),
          processing_status: "done",
          transcription_raw: rawText,
          content_structured: { resume: rawText, tags: [activite.domaine] },
        } as any),
      ]);
      toast({ title: "Séance enregistrée !" });
      navigate("/outils/activites");
    } catch {
      toast({ title: "Erreur lors de l'enregistrement", variant: "destructive" });
      setSaving(false);
    }
  };

  if (!activite) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)" }}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1
          className="text-lg font-semibold text-foreground flex-1"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          {activite.nom}
        </h1>
        <span
          className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{
            color: domainColor,
            background: `${domainColor}18`,
            letterSpacing: "0.05em",
          }}
        >
          {activite.domaine}
        </span>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 pt-8 pb-32">
        {!showRecap ? (
          <>
            {/* Chrono circle */}
            <div
              className="flex items-center justify-center"
              style={{
                ...glassCard,
                width: 200,
                height: 200,
                borderRadius: "50%",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: 42,
                  fontWeight: 600,
                  color: "#1E1A1A",
                }}
              >
                {formatTime(seconds)}
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-5 mt-8">
              <button
                onClick={() => setRunning((r) => !r)}
                className="flex items-center justify-center"
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  ...glassCard,
                }}
              >
                {running ? (
                  <Pause className="h-6 w-6 text-foreground" />
                ) : (
                  <Play className="h-6 w-6 text-foreground" />
                )}
              </button>

              <button
                onClick={handleTerminer}
                className="px-6 py-3 rounded-2xl text-[15px] font-semibold text-white"
                style={{
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                  boxShadow: "0 6px 20px rgba(139,116,224,0.4)",
                }}
              >
                Terminer la séance
              </button>
            </div>

            {/* Distance section */}
            {activite.track_distance && (
              <div className="w-full mt-8" style={{ maxWidth: 360 }}>
                <div style={{ ...glassCard, padding: "16px" }}>
                  <label
                    className="text-xs font-semibold uppercase tracking-wide mb-2 block"
                    style={{ color: "#9A9490" }}
                  >
                    Distance ({unite})
                  </label>
                  <input
                    type="number"
                    value={distance || ""}
                    onChange={(e) => setDistance(Number(e.target.value))}
                    placeholder="0"
                    className="w-full text-center text-2xl font-semibold bg-transparent outline-none"
                    style={{ fontFamily: "'DM Sans', sans-serif", color: "#1E1A1A" }}
                    min={0}
                    step={0.1}
                  />
                  <div className="flex justify-center gap-2 mt-3">
                    {[0.5, 1, 2, 5].map((v) => (
                      <button
                        key={v}
                        onClick={() => setDistance((d) => Math.round((d + v) * 100) / 100)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold text-white"
                        style={{ background: domainColor }}
                      >
                        +{v}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Recap */
          <div className="w-full" style={{ maxWidth: 420 }}>
            <div style={{ ...glassCard, padding: "20px" }}>
              <h2
                className="text-lg font-semibold mb-4"
                style={{ fontFamily: "'Fraunces', serif", color: "#1E1A1A" }}
              >
                Résumé de la séance
              </h2>

              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <p className="text-xs uppercase font-semibold" style={{ color: "#9A9490" }}>
                    Durée
                  </p>
                  <p className="text-xl font-semibold" style={{ color: "#1E1A1A" }}>
                    {formatTime(seconds)}
                  </p>
                </div>
                {activite.track_distance && distance > 0 && (
                  <>
                    <div style={{ width: 1, height: 32, background: "rgba(0,0,0,0.1)" }} />
                    <div className="text-center">
                      <p className="text-xs uppercase font-semibold" style={{ color: "#9A9490" }}>
                        Distance
                      </p>
                      <p className="text-xl font-semibold" style={{ color: "#1E1A1A" }}>
                        {distance} {unite}
                      </p>
                    </div>
                  </>
                )}
              </div>

              <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "#9A9490" }}>
                Note (optionnel)
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Comment s'est passée la séance ?"
                className="bg-white/50 border-white/60 rounded-xl text-sm min-h-[80px]"
              />

              <button
                disabled={saving}
                onClick={handleSave}
                className="w-full mt-4 py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
                style={{
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                  boxShadow: "0 6px 20px rgba(139,116,224,0.4)",
                }}
              >
                {saving ? "Enregistrement…" : "Enregistrer la séance"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
