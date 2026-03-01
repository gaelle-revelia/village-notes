import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { toast } from "@/hooks/use-toast";

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

const DOMAIN_COLORS: Record<string, string> = {
  Moteur: "#E8736A",
  Cognitif: "#8B74E0",
  Sensoriel: "#44A882",
  "Bien-être": "#E8A44A",
  Médical: "#8A9BAE",
};

interface Activite {
  id: string;
  nom: string;
  domaine: string;
  track_temps: boolean | null;
  track_distance: boolean | null;
  unite_distance: string | null;
}

function parseDuration(val: string): number {
  const parts = val.split(":");
  if (parts.length === 2) {
    return (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
  }
  return parseInt(val, 10) || 0;
}

function formatTime(s: number) {
  const mm = String(Math.floor(s / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export default function OutilsActiviteManuel() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enfantId } = useEnfantId();

  const [activite, setActivite] = useState<Activite | null>(null);
  const [durationInput, setDurationInput] = useState("");
  const [distance, setDistance] = useState<number>(0);
  const [memoDate, setMemoDate] = useState(new Date());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    supabase
      .from("activites")
      .select("id, nom, domaine, track_temps, track_distance, unite_distance")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setActivite(data as Activite);
      });
  }, [id]);

  const domainColor = activite ? DOMAIN_COLORS[activite.domaine] || "#8A9BAE" : "#8A9BAE";
  const unite = activite?.unite_distance || "m";

  const handleSave = async () => {
    if (!user || !enfantId || !activite) return;
    setSaving(true);

    const seconds = parseDuration(durationInput);
    const timeStr = formatTime(seconds);
    const distStr = activite.track_distance && distance > 0 ? ` / ${distance} ${unite}` : "";
    const rawText = `${activite.nom} — ${timeStr}${distStr}`;
    const dateStr = memoDate.toISOString().slice(0, 10);

    try {
      await Promise.all([
        supabase.from("sessions_activite").insert({
          activite_id: activite.id,
          enfant_id: enfantId,
          duree_secondes: seconds || null,
          distance: activite.track_distance ? distance : null,
          notes: notes || null,
          created_at: memoDate.toISOString(),
        } as any),
        supabase.from("memos").insert({
          type: "activite",
          user_id: user.id,
          enfant_id: enfantId,
          memo_date: dateStr,
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
      <header className="flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="h-5 w-5 text-foreground" />
        </button>
        <h1
          className="text-lg font-semibold text-foreground flex-1"
          style={{ fontFamily: "'Fraunces', serif" }}
        >
          Saisie manuelle
        </h1>
        <span
          className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full"
          style={{ color: domainColor, background: `${domainColor}18`, letterSpacing: "0.05em" }}
        >
          {activite.domaine}
        </span>
      </header>

      <main className="flex-1 px-4 pt-6 pb-32 flex flex-col gap-3" style={{ maxWidth: 480, margin: "0 auto", width: "100%" }}>
        {/* Duration */}
        {activite.track_temps && (
          <div style={{ ...glassCard, padding: "14px 16px" }}>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "#9A9490" }}>
              Durée (MM:SS)
            </label>
            <Input
              value={durationInput}
              onChange={(e) => setDurationInput(e.target.value)}
              placeholder="00:00"
              className="bg-white/50 border-white/60 rounded-xl text-center text-lg font-semibold"
            />
          </div>
        )}

        {/* Distance */}
        {activite.track_distance && (
          <div style={{ ...glassCard, padding: "14px 16px" }}>
            <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "#9A9490" }}>
              Distance ({unite})
            </label>
            <Input
              type="number"
              value={distance || ""}
              onChange={(e) => setDistance(Number(e.target.value))}
              placeholder="0"
              min={0}
              step={0.1}
              className="bg-white/50 border-white/60 rounded-xl text-center text-lg font-semibold"
            />
          </div>
        )}

        {/* Date */}
        <div style={{ ...glassCard, padding: "14px 16px" }}>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "#9A9490" }}>
            Date
          </label>
          <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
        </div>

        {/* Notes */}
        <div style={{ ...glassCard, padding: "14px 16px" }}>
          <label className="text-xs font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "#9A9490" }}>
            Note (optionnel)
          </label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Comment s'est passée la séance ?"
            className="bg-white/50 border-white/60 rounded-xl text-sm min-h-[80px]"
          />
        </div>

        {/* CTA */}
        <button
          disabled={saving}
          onClick={handleSave}
          className="w-full mt-3 py-3.5 rounded-2xl text-[15px] font-semibold text-white transition-opacity disabled:opacity-40"
          style={{
            background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            boxShadow: "0 6px 20px rgba(139,116,224,0.4)",
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer la séance"}
        </button>
      </main>
    </div>
  );
}
