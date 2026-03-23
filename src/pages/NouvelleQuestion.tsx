import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Loader2, Mic, Square, X } from "lucide-react";
import { format } from "date-fns";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { supabase } from "@/integrations/supabase/client";

type Intervenant = {
  id: string;
  nom: string;
  specialite: string | null;
};

const MEMBER_PALETTES = [
  {
    avatar: "linear-gradient(135deg, hsl(4 68% 66%), hsl(18 76% 63%))",
    accent: "4 68% 66%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(258 58% 67%), hsl(201 62% 60%))",
    accent: "258 58% 67%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(155 42% 47%), hsl(205 52% 55%))",
    accent: "155 42% 47%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(37 78% 60%), hsl(4 68% 66%))",
    accent: "37 78% 60%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(4 68% 66%), hsl(332 50% 57%))",
    accent: "332 50% 57%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(210 18% 61%), hsl(211 28% 49%))",
    accent: "210 18% 61%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(155 42% 47%), hsl(258 58% 67%))",
    accent: "155 42% 47%",
  },
  {
    avatar: "linear-gradient(135deg, hsl(201 62% 60%), hsl(258 58% 67%))",
    accent: "201 62% 60%",
  },
] as const;

const glassHeader: CSSProperties = {
  background: "hsl(var(--background) / 0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid hsl(var(--border) / 0.6)",
  boxShadow: "0 2px 12px hsl(var(--foreground) / 0.05)",
};

const glassFieldStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.72)",
};

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function getMemberPalette(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return MEMBER_PALETTES[Math.abs(hash) % MEMBER_PALETTES.length];
}

function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const remainingSeconds = (seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;

  const normalizedText = normalize(text);
  const normalizedQuery = normalize(query);
  const index = normalizedText.indexOf(normalizedQuery);

  if (index === -1) return <>{text}</>;

  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-secondary">
        {text.slice(index, index + query.length)}
      </span>
      {text.slice(index + query.length)}
    </>
  );
}

export default function NouvelleQuestion() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();

  const validTypes = ["rdv", "rappel", "question"] as const;
  const paramType = searchParams.get("type") as typeof validTypes[number] | null;
  const [type, setType] = useState<"rdv" | "rappel" | "question">(
    paramType && validTypes.includes(paramType) ? paramType : "question"
  );
  const [question, setQuestion] = useState("");
  const [precisions, setPrecisions] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [isApproximate, setIsApproximate] = useState(type === "rappel");
  const [approxMonth, setApproxMonth] = useState(new Date().getMonth());
  const [approxYear, setApproxYear] = useState(new Date().getFullYear());

  const MONTHS = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
  ];
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);

  const { isRecording, elapsedSeconds, audioBlob, permissionDenied, start, stop, reset } =
    useAudioRecorder();

  useEffect(() => {
    if (!enfantId) return;

    let cancelled = false;
    setLoadingIntervenants(true);

    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("nom")
      .then(({ data, error: fetchError }) => {
        if (cancelled) return;

        if (fetchError) {
          toast({
            title: "Impossible de charger les membres du village",
            description: "Réessayez dans un instant.",
            variant: "destructive",
          });
          setIntervenants([]);
        } else {
          const list = data ?? [];
          setIntervenants(list);
          const paramProId = searchParams.get("pro_id");
          if (paramProId && list.some((i) => i.id === paramProId)) {
            setSelectedIds([paramProId]);
          }
        }

        setLoadingIntervenants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enfantId, toast]);

  useEffect(() => {
    if (!audioBlob) return;

    let cancelled = false;

    const transcribeAudio = async () => {
      setIsTranscribing(true);
      setTranscriptionError(null);

      try {
        const mimeType = audioBlob.type || "audio/webm";
        const extension = mimeType.includes("mp4") || mimeType.includes("mpeg") ? "m4a" : "webm";
        const audioPath = `synthesis/${crypto.randomUUID()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("audio-temp")
          .upload(audioPath, audioBlob, { contentType: mimeType, upsert: false });

        if (uploadError) throw uploadError;

        const { data, error: fnError } = await supabase.functions.invoke("process-memo", {
          body: { mode: "question_reformulation", audio_path: audioPath, boucle_type: type, child_id: enfantId },
        });

        if (fnError) throw fnError;

        const reformulatedQuestion = data?.question?.trim() || "";
        const reformulatedPrecisions = data?.precisions?.trim() || "";

        if (!reformulatedQuestion) {
          throw new Error("Empty reformulated question");
        }

        if (cancelled) return;

        setQuestion(reformulatedQuestion);
        setPrecisions(reformulatedPrecisions);
        toast({
          title: "Question reformulée",
          description: "Vous pouvez maintenant la relire avant de l'ajouter.",
        });
      } catch (err) {
        console.error("Question reformulation error:", err);

        if (cancelled) return;

        setTranscriptionError("Reformulation échouée — réessaie ou utilise la saisie texte.");
        toast({
          title: "Reformulation impossible",
          description: "Réessaie ou passe en saisie texte.",
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setIsTranscribing(false);
          reset();
        }
      }
    };

    void transcribeAudio();

    return () => {
      cancelled = true;
    };
  }, [audioBlob, reset, toast]);

  const filteredIntervenants = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = normalize(searchQuery);

    return intervenants.filter(
      (intervenant) =>
        normalize(intervenant.nom).includes(query) ||
        (intervenant.specialite && normalize(intervenant.specialite).includes(query))
    );
  }, [intervenants, searchQuery]);

  const selectedIntervenants = useMemo(
    () =>
      selectedIds
        .map((id) => intervenants.find((intervenant) => intervenant.id === id))
        .filter(Boolean) as Intervenant[],
    [intervenants, selectedIds]
  );

  const toggleIntervenant = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleStartRecording = async () => {
    setTranscriptionError(null);
    await start();
  };

  const handleStopRecording = () => {
    stop();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    const trimmedPrecisions = precisions.trim();
    if (!trimmedQuestion || !user || !enfantId) return;
    if (type === "rdv" && !dueDate) return;

    setSubmitting(true);

    const computedDueDate =
      type === "question"
        ? null
        : isApproximate && type === "rappel"
          ? `${approxYear}-${String(approxMonth + 1).padStart(2, "0")}-01`
          : dueDate
            ? format(dueDate, "yyyy-MM-dd")
            : null;

    const { error: insertError } = await supabase.from("questions").insert({
      parent_id: user.id,
      child_id: enfantId,
      text: trimmedQuestion,
      precisions: trimmedPrecisions || null,
      linked_pro_ids: selectedIds,
      status: "to_ask",
      type,
      due_date: computedDueDate,
      is_approximate_date: type === "rappel" && isApproximate,
      archived_at: null,
    });

    setSubmitting(false);

    if (insertError) {
      toast({
        title: "Impossible d'ajouter",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: type === "rdv" ? "RDV ajouté" : type === "rappel" ? "Rappel ajouté" : "Question ajoutée",
    });
    navigate("/a-venir");
  };

  if (authLoading || enfantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button
          type="button"
          onClick={() => navigate("/a-venir")}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Retour"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Nouveau</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-5">
          {/* Type selector */}
          <div className="grid grid-cols-3 gap-3">
            {([
              { value: "rdv" as const, emoji: "📅", label: "RDV" },
              { value: "rappel" as const, emoji: "🔔", label: "Rappel" },
              { value: "question" as const, emoji: "❓", label: "Question" },
            ]).map((item) => {
              const isActive = type === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => { setType(item.value); }}
                  style={{
                    background: isActive ? "rgba(139,116,224,0.1)" : "rgba(255,255,255,0.52)",
                    border: isActive ? "1.5px solid #8B74E0" : "1px solid rgba(255,255,255,0.72)",
                    borderRadius: 14,
                    padding: "12px 8px",
                    textAlign: "center",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 24 }}>{item.emoji}</div>
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 500,
                      color: isActive ? "#534AB7" : "#9A9490",
                      marginTop: 4,
                    }}
                  >
                    {item.label}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Vocal strip */}
          {permissionDenied ? (
            <p style={{ fontSize: 12, color: "#9A9490", textAlign: "center" }}>
              Microphone non disponible — utilisez la saisie texte.
            </p>
          ) : (
            <div
              onClick={!isTranscribing ? (isRecording ? handleStopRecording : handleStartRecording) : undefined}
              style={{
                background: isRecording
                  ? "rgba(232,115,106,0.15)"
                  : "linear-gradient(135deg, rgba(232,115,106,0.1), rgba(139,116,224,0.1))",
                border: isRecording
                  ? "1px solid rgba(232,115,106,0.3)"
                  : "1px solid rgba(255,255,255,0.8)",
                borderRadius: 14,
                padding: "12px 14px",
                display: "flex",
                alignItems: "center",
                gap: 10,
                cursor: isTranscribing ? "wait" : "pointer",
              }}
            >
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isTranscribing}
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: "50%",
                  background: isRecording ? "#E8736A" : "linear-gradient(135deg, #E8736A, #8B74E0)",
                  border: "none",
                  cursor: isTranscribing ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 4px 12px rgba(139,116,224,0.3)",
                  flexShrink: 0,
                  opacity: isTranscribing ? 0.6 : 1,
                }}
              >
                {isTranscribing ? (
                  <Loader2 size={18} color="white" className="animate-spin" />
                ) : isRecording ? (
                  <Square size={16} color="white" fill="white" />
                ) : (
                  <Mic size={18} color="white" />
                )}
              </button>

              {isRecording ? (
                <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 500, color: "#1E1A1A", letterSpacing: 3 }}>
                  {formatTime(elapsedSeconds)}
                </div>
              ) : isTranscribing ? (
                <div style={{ fontSize: 13, fontWeight: 500, color: "#9A9490" }}>
                  Reformulation en cours...
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1E1A1A" }}>
                    {type === "rdv" ? "Dicter le RDV" : type === "rappel" ? "Dicter le rappel" : "Dicter la question"}
                  </div>
                  <div style={{ fontSize: 11, color: "#9A9490" }}>
                    L'IA remplit le titre et les précisions
                  </div>
                </div>
              )}
            </div>
          )}

          {transcriptionError && (
            <p className="text-xs text-destructive text-center">{transcriptionError}</p>
          )}

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#9A9490", fontWeight: 500, letterSpacing: "0.04em" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(139,116,224,0.15)" }} />
            OU SAISIR MANUELLEMENT
            <div style={{ flex: 1, height: 1, background: "rgba(139,116,224,0.15)" }} />
          </div>

          {/* Form — always visible */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title field */}
            <div className="space-y-2">
              <label htmlFor="question-text" className="text-sm font-medium text-foreground">
                Titre
              </label>
              <input
                id="question-text"
                type="text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder={
                  type === "rdv"
                    ? "Ex : RDV kiné — préparer les questions"
                    : type === "rappel"
                      ? "Ex : Relancer hôpital Bordeaux"
                      : "Ex : Continuer les retournements ?"
                }
                required
                className="h-12 w-full rounded-xl px-3 py-2 text-base font-medium text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                style={glassFieldStyle}
              />
            </div>

            {/* Date — RDV (required) */}
            {type === "rdv" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Date</Label>
                <MemoDatePicker date={dueDate ?? new Date()} onDateChange={(d) => setDueDate(d)} />
              </div>
            )}

            {/* Date — Rappel (optional, with approximate toggle) */}
            {type === "rappel" && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Date (optionnelle)</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={isApproximate}
                    onCheckedChange={setIsApproximate}
                    id="approx-toggle"
                  />
                  <label htmlFor="approx-toggle" className="text-sm text-muted-foreground cursor-pointer">
                    Date approximative
                  </label>
                </div>
                {isApproximate ? (
                  <div className="grid grid-cols-2 gap-3">
                    <Select value={String(approxMonth)} onValueChange={(v) => setApproxMonth(Number(v))}>
                      <SelectTrigger className="rounded-xl" style={glassFieldStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={String(approxYear)} onValueChange={(v) => setApproxYear(Number(v))}>
                      <SelectTrigger className="rounded-xl" style={glassFieldStyle}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027, 2028, 2029, 2030].map((y) => (
                          <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <MemoDatePicker date={dueDate ?? new Date()} onDateChange={(d) => setDueDate(d)} />
                )}
              </div>
            )}

            {/* Intervenant — simple search, no auto-suggestions */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Pour quel intervenant ?
              </label>

              {selectedIntervenants.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedIntervenants.map((intervenant) => {
                    const palette = getMemberPalette(intervenant.id);
                    return (
                      <div
                        key={intervenant.id}
                        className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-sm"
                        style={{
                          backgroundColor: `hsl(${palette.accent} / 0.14)`,
                          borderColor: `hsl(${palette.accent} / 0.32)`,
                          color: `hsl(${palette.accent})`,
                        }}
                      >
                        <div
                          className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white"
                          style={{ background: palette.avatar }}
                        >
                          {intervenant.nom.charAt(0).toUpperCase()}
                        </div>
                        <span className="max-w-[140px] truncate font-medium">{intervenant.nom}</span>
                        <button
                          type="button"
                          onClick={() => toggleIntervenant(intervenant.id)}
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
                          aria-label={`Retirer ${intervenant.nom}`}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                type="text"
                placeholder="Chercher un professionnel…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 11,
                  border: "1px solid rgba(255,255,255,0.72)",
                  background: "rgba(255,255,255,0.52)",
                  fontSize: 13,
                  color: "#1E1A1A",
                  outline: "none",
                }}
              />

              {searchQuery.trim() && (
                <div className="space-y-1">
                  {filteredIntervenants.length > 0 ? (
                    filteredIntervenants.map((intervenant) => (
                      <IntervenantRow
                        key={intervenant.id}
                        intervenant={intervenant}
                        query={searchQuery}
                        selected={selectedIds.includes(intervenant.id)}
                        onToggle={() => {
                          toggleIntervenant(intervenant.id);
                          setSearchQuery("");
                        }}
                      />
                    ))
                  ) : (
                    <p className="py-2 text-center text-xs text-muted-foreground">Aucun résultat</p>
                  )}
                </div>
              )}
            </div>

            {/* Précisions */}
            <div className="space-y-2">
              <label htmlFor="question-precisions" className="text-sm font-medium text-foreground">
                Précisions complémentaires (optionnel)
              </label>
              <Textarea
                id="question-precisions"
                value={precisions}
                onChange={(event) => setPrecisions(event.target.value)}
                placeholder="Ajoutez un contexte utile si besoin"
                rows={1}
                className="w-full rounded-xl resize-none"
                style={glassFieldStyle}
                autoResize
              />
            </div>

            {/* Submit */}
            <Button
              type="submit"
              className="h-12 w-full rounded-xl text-base"
              disabled={
                submitting ||
                !question.trim() ||
                !user ||
                !enfantId ||
                (type === "rdv" && !dueDate)
              }
            >
              {submitting ? "Ajout…" : "Ajouter"}
            </Button>
          </form>
        </div>
      </main>
    </div>
  );
}

function IntervenantRow({
  intervenant,
  query,
  selected,
  onToggle,
}: {
  intervenant: Intervenant;
  query: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const palette = getMemberPalette(intervenant.id);

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: selected ? `hsl(${palette.accent} / 0.08)` : "transparent",
        border: selected
          ? `1px solid hsl(${palette.accent} / 0.25)`
          : "1px solid transparent",
      }}
      aria-pressed={selected}
    >
      <div
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ background: palette.avatar }}
      >
        {intervenant.nom.charAt(0).toUpperCase()}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          <HighlightMatch text={intervenant.nom} query={query} />
        </p>
        {intervenant.specialite && (
          <p className="truncate text-xs text-muted-foreground">
            <HighlightMatch text={intervenant.specialite} query={query} />
          </p>
        )}
      </div>

      <span
        className="text-xs font-medium"
        style={{ color: selected ? `hsl(${palette.accent})` : "hsl(var(--muted-foreground))" }}
      >
        {selected ? "✓" : "Choisir"}
      </span>
    </button>
  );
}
