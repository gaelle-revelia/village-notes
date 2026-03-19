import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Keyboard, Mic, Search, Square, X } from "lucide-react";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
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

const searchFieldStyle: CSSProperties = {
  background: "hsl(var(--background) / 0.45)",
  backdropFilter: "blur(12px) saturate(1.4)",
  WebkitBackdropFilter: "blur(12px) saturate(1.4)",
  border: "1px solid hsl(var(--background) / 0.65)",
  borderRadius: 12,
  boxShadow:
    "0 2px 8px hsl(var(--foreground) / 0.05), inset 0 1px 0 hsl(var(--background) / 0.7)",
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
  const { user, loading: authLoading } = useAuth();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();

  const [mode, setMode] = useState<"voice" | "text">("voice");
  const [questionDate, setQuestionDate] = useState(new Date());
  const [question, setQuestion] = useState("");
  const [precisions, setPrecisions] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
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
          setIntervenants(data ?? []);
        }

        setLoadingIntervenants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enfantId, toast]);

  useEffect(() => {
    if (!enfantId) return;

    supabase
      .from("memos")
      .select("intervenant_id, memo_date")
      .not("intervenant_id", "is", null)
      .not("enfant_id", "is", null)
      .order("memo_date", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return;

        const seen = new Set<string>();
        const ids: string[] = [];

        for (const memo of data) {
          if (memo.intervenant_id && !seen.has(memo.intervenant_id)) {
            seen.add(memo.intervenant_id);
            ids.push(memo.intervenant_id);
            if (ids.length >= 3) break;
          }
        }

        setRecentIds(ids);
      });
  }, [enfantId]);

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
          body: { mode: "question_reformulation", audio_path: audioPath },
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
        setMode("text");
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

  const recentIntervenants = useMemo(() => {
    if (recentIds.length > 0) {
      return recentIds
        .map((id) => intervenants.find((intervenant) => intervenant.id === id))
        .filter(Boolean) as Intervenant[];
    }

    return intervenants.slice(0, 3);
  }, [intervenants, recentIds]);

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

    setSubmitting(true);

    const { error: insertError } = await supabase.from("questions").insert({
      parent_id: user.id,
      child_id: enfantId,
      text: trimmedQuestion,
      precisions: trimmedPrecisions || null,
      linked_pro_ids: selectedIds,
      status: "to_ask",
    });

    setSubmitting(false);

    if (insertError) {
      toast({
        title: "Impossible d'ajouter la question",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Question ajoutée",
      description: "Votre question a bien été enregistrée.",
    });
    navigate("/outils");
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
          onClick={() => navigate("/timeline")}
          className="text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Retour à la timeline"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Nouvelle question</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          <MemoDatePicker date={questionDate} onDateChange={setQuestionDate} />

          <IntervenantSelection
            loadingIntervenants={loadingIntervenants}
            intervenants={intervenants}
            filteredIntervenants={filteredIntervenants}
            recentIntervenants={recentIntervenants}
            selectedIntervenants={selectedIntervenants}
            selectedIds={selectedIds}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onToggleIntervenant={toggleIntervenant}
            label="Pour quel intervenant ?"
          />

          {mode === "voice" ? (
            <section className="space-y-8 pt-4">
              {permissionDenied ? (
                <div className="space-y-4 py-6 text-center">
                  <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-muted">
                    <Mic className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold text-card-foreground">Micro non disponible</h2>
                  <p className="text-sm text-muted-foreground">
                    L'accès au microphone a été refusé. Vous pouvez saisir votre question en texte.
                  </p>
                  <Button type="button" onClick={() => setMode("text")} className="rounded-xl">
                    <Keyboard className="mr-2 h-4 w-4" />
                    Saisir en texte
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col items-center space-y-8 py-6">
                  <div className="text-4xl font-mono tracking-wider text-card-foreground">
                    {formatTime(elapsedSeconds)}
                  </div>

                  <div className="relative">
                    {isRecording && (
                      <>
                        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
                        <div className="absolute -inset-3 rounded-full bg-secondary/15 animate-pulse" />
                      </>
                    )}
                    <button
                      type="button"
                      onClick={isRecording ? handleStopRecording : handleStartRecording}
                      disabled={isTranscribing}
                      className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full text-primary-foreground shadow-lg transition-all disabled:cursor-wait disabled:opacity-70"
                      style={{
                        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))",
                        boxShadow: "0 12px 30px hsl(var(--secondary) / 0.3)",
                      }}
                      aria-label={isRecording ? "Arrêter l'enregistrement" : "Commencer l'enregistrement"}
                    >
                      {isRecording ? (
                        <Square className="h-8 w-8" fill="currentColor" />
                      ) : (
                        <Mic className="h-10 w-10" />
                      )}
                    </button>
                  </div>

                  <div className="space-y-2 text-center">
                    <p className="max-w-[250px] text-sm text-muted-foreground">
                      {isTranscribing
                        ? "Reformulation en cours..."
                        : isRecording
                          ? "Posez votre question... Appuyez sur le bouton pour arrêter."
                          : "Appuyez sur le micro pour commencer l'enregistrement"}
                    </p>
                    {transcriptionError && !permissionDenied && (
                      <p className="max-w-[280px] text-xs text-destructive">{transcriptionError}</p>
                    )}
                  </div>

                  {!isRecording && !isTranscribing && (
                    <button
                      type="button"
                      onClick={() => setMode("text")}
                      className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <Keyboard className="h-3.5 w-3.5" />
                      Saisir en texte à la place
                    </button>
                  )}
                </div>
              )}
            </section>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pt-2">
              <div className="space-y-2">
                <label htmlFor="question-text" className="text-sm font-medium text-foreground">
                  Votre question
                </label>
                <input
                  id="question-text"
                  type="text"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Écrivez votre question ici"
                  required
                  className="h-12 w-full rounded-xl px-3 py-2 text-base font-medium text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  style={glassFieldStyle}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="question-precisions" className="text-sm font-medium text-foreground">
                  Précisions complémentaires (optionnel)
                </label>
                <Textarea
                  id="question-precisions"
                  value={precisions}
                  onChange={(event) => setPrecisions(event.target.value)}
                  placeholder="Ajoutez un contexte utile si besoin"
                  rows={3}
                  className="w-full rounded-xl resize-none"
                  style={glassFieldStyle}
                />
              </div>

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-xl text-base"
                  disabled={submitting || !question.trim() || !user || !enfantId}
                >
                  {submitting ? "Ajout…" : "Ajouter"}
                </Button>

                <button
                  type="button"
                  onClick={() => setMode("voice")}
                  className="flex w-full items-center justify-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Mic className="h-3.5 w-3.5" />
                  Enregistrer en vocal à la place
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function IntervenantSelection({
  loadingIntervenants,
  intervenants,
  filteredIntervenants,
  recentIntervenants,
  selectedIntervenants,
  selectedIds,
  searchQuery,
  onSearchChange,
  onToggleIntervenant,
  label,
}: {
  loadingIntervenants: boolean;
  intervenants: Intervenant[];
  filteredIntervenants: Intervenant[];
  recentIntervenants: Intervenant[];
  selectedIntervenants: Intervenant[];
  selectedIds: string[];
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onToggleIntervenant: (id: string) => void;
  label: string;
}) {
  return (
    <div className="space-y-3">
      <label htmlFor="question-intervenant-search" className="text-sm font-medium text-foreground">
        {label}
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
                  onClick={() => onToggleIntervenant(intervenant.id)}
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

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="question-intervenant-search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Nom ou spécialité..."
          className="w-full py-2.5 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          style={searchFieldStyle}
        />
      </div>

      {loadingIntervenants ? (
        <p className="animate-pulse text-sm text-muted-foreground">Chargement...</p>
      ) : intervenants.length === 0 ? (
        <p className="text-xs text-muted-foreground">Aucun membre enregistré.</p>
      ) : searchQuery.trim() ? (
        <div className="space-y-1">
          <p className="px-1 text-xs text-muted-foreground">
            {filteredIntervenants.length} résultat{filteredIntervenants.length !== 1 ? "s" : ""}
          </p>
          {filteredIntervenants.map((intervenant) => (
            <IntervenantRow
              key={intervenant.id}
              intervenant={intervenant}
              query={searchQuery}
              selected={selectedIds.includes(intervenant.id)}
              onToggle={() => onToggleIntervenant(intervenant.id)}
            />
          ))}
          {filteredIntervenants.length === 0 && (
            <p className="py-3 text-center text-xs text-muted-foreground">Aucun résultat</p>
          )}
        </div>
      ) : recentIntervenants.length > 0 ? (
        <div className="space-y-1">
          <p className="px-1 text-xs font-medium tracking-[0.03em] text-muted-foreground">Récents</p>
          {recentIntervenants.map((intervenant) => (
            <IntervenantRow
              key={intervenant.id}
              intervenant={intervenant}
              query=""
              selected={selectedIds.includes(intervenant.id)}
              onToggle={() => onToggleIntervenant(intervenant.id)}
            />
          ))}
        </div>
      ) : null}
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
        {selected ? "Sélectionné" : "Choisir"}
      </span>
    </button>
  );
}
