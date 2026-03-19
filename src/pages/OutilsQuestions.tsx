import { type CSSProperties, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNavBar from "@/components/BottomNavBar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const MEMBER_PALETTES = [
  { accent: "4 68% 66%" },
  { accent: "258 58% 67%" },
  { accent: "155 42% 47%" },
  { accent: "37 78% 60%" },
  { accent: "332 50% 57%" },
  { accent: "210 18% 61%" },
  { accent: "155 42% 47%" },
  { accent: "201 62% 60%" },
] as const;

const glassHeader: CSSProperties = {
  background: "hsl(var(--background) / 0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid hsl(var(--border) / 0.6)",
  boxShadow: "0 2px 12px hsl(var(--foreground) / 0.05)",
};

const glassCard: CSSProperties = {
  background: "hsl(var(--background) / 0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid hsl(var(--background) / 0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px hsl(var(--secondary) / 0.08), 0 1px 4px hsl(var(--foreground) / 0.06), inset 0 1px 0 hsl(var(--background) / 0.9)",
};

const answerBlockStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  borderLeft: "2px solid #AFA9EC",
  borderRadius: 8,
  padding: "8px 12px",
};

const answerInputStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.72)",
};

type QuestionStatus = "to_ask" | "asked";

type QuestionItem = {
  id: string;
  text: string;
  linked_pro_ids: string[];
  status: QuestionStatus;
  answer: string | null;
  created_at: string;
  asked_at: string | null;
};

type Member = {
  id: string;
  nom: string;
  specialite: string | null;
};

function getMemberPalette(id: string) {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) | 0;
  }
  return MEMBER_PALETTES[Math.abs(hash) % MEMBER_PALETTES.length];
}

function formatDate(value: string | null) {
  if (!value) return "";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function isQuestionStatus(value: string): value is QuestionStatus {
  return value === "to_ask" || value === "asked";
}

export default function OutilsQuestions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [intervenantsById, setIntervenantsById] = useState<Record<string, Member>>({});
  const [activeTab, setActiveTab] = useState<QuestionStatus>("to_ask");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [editingAnswerIds, setEditingAnswerIds] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || enfantLoading) return;

    if (!user || !enfantId) {
      setQuestions([]);
      setIntervenantsById({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    Promise.all([
      supabase
        .from("questions")
        .select("id, text, linked_pro_ids, status, answer, created_at, asked_at")
        .eq("parent_id", user.id)
        .eq("child_id", enfantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("intervenants")
        .select("id, nom, specialite")
        .eq("enfant_id", enfantId)
        .eq("actif", true)
        .order("nom"),
    ]).then(([questionsResult, intervenantsResult]) => {
      if (cancelled) return;

      if (questionsResult.error || intervenantsResult.error) {
        toast({
          title: "Impossible de charger les questions",
          description: "Réessayez dans un instant.",
          variant: "destructive",
        });
        setQuestions([]);
        setIntervenantsById({});
        setLoading(false);
        return;
      }

      const normalizedQuestions: QuestionItem[] = (questionsResult.data ?? []).flatMap((item) => {
        if (!isQuestionStatus(item.status)) return [];

        return [{
          id: item.id,
          text: item.text,
          linked_pro_ids: Array.isArray(item.linked_pro_ids) ? item.linked_pro_ids : [],
          status: item.status,
          answer: item.answer,
          created_at: item.created_at,
          asked_at: item.asked_at,
        }];
      });

      const initialDrafts = normalizedQuestions.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.id] = item.answer ?? "";
        return accumulator;
      }, {});

      const initialEditing = normalizedQuestions.reduce<Record<string, boolean>>((accumulator, item) => {
        accumulator[item.id] = false;
        return accumulator;
      }, {});

      const membersMap = (intervenantsResult.data ?? []).reduce<Record<string, Member>>((accumulator, member) => {
        accumulator[member.id] = member;
        return accumulator;
      }, {});

      setQuestions(normalizedQuestions);
      setAnswerDrafts(initialDrafts);
      setEditingAnswerIds(initialEditing);
      setIntervenantsById(membersMap);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [authLoading, enfantId, enfantLoading, toast, user]);

  const questionsToAsk = useMemo(
    () => questions.filter((question) => question.status === "to_ask"),
    [questions],
  );

  const askedQuestions = useMemo(
    () => questions.filter((question) => question.status === "asked"),
    [questions],
  );

  const updateQuestionLocally = (questionId: string, updates: Partial<QuestionItem>) => {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? { ...question, ...updates } : question)),
    );
  };

  const handleMarkAsked = async (question: QuestionItem) => {
    const nextStatus: QuestionStatus = question.status === "asked" ? "to_ask" : "asked";
    const askedAt = nextStatus === "asked" ? new Date().toISOString() : null;
    setSavingId(question.id);

    const { error } = await supabase
      .from("questions")
      .update({ status: nextStatus, asked_at: askedAt })
      .eq("id", question.id);

    if (error) {
      toast({
        title: "Impossible de mettre à jour la question",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      setSavingId(null);
      return;
    }

    updateQuestionLocally(question.id, { status: nextStatus, asked_at: askedAt });
    if (nextStatus === "to_ask") {
      setEditingAnswerIds((current) => ({ ...current, [question.id]: false }));
    }
    setSavingId(null);
  };

  const handleSaveAnswer = async (questionId: string) => {
    setSavingId(questionId);
    const answer = (answerDrafts[questionId] ?? "").trim();

    const { error } = await supabase
      .from("questions")
      .update({ answer: answer || null })
      .eq("id", questionId);

    if (error) {
      toast({
        title: "Impossible d'enregistrer la réponse",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      setSavingId(null);
      return;
    }

    updateQuestionLocally(questionId, { answer: answer || null });
    setEditingAnswerIds((current) => ({ ...current, [questionId]: false }));
    toast({ title: "Réponse enregistrée" });
    setSavingId(null);
  };

  const renderQuestionList = (items: QuestionItem[], emptyLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
          <p className="max-w-[260px] text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      );
    }

    return (
      <div className="flex flex-col gap-3">
        {items.map((question) => {
          const linkedMembers = question.linked_pro_ids
            .map((memberId) => intervenantsById[memberId])
            .filter(Boolean);
          const answerValue = answerDrafts[question.id] ?? "";
          const isSaving = savingId === question.id;
          const isAsked = question.status === "asked";
          const isEditingAnswer = editingAnswerIds[question.id] || (!question.answer && isAsked);

          return (
            <article key={question.id} className="flex items-start gap-3 p-4" style={glassCard}>
              <div className="flex items-start pt-1">
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void handleMarkAsked(question)}
                  aria-label={
                    isAsked
                      ? `Remettre la question ${question.text} dans À poser`
                      : `Marquer la question ${question.text} comme posée`
                  }
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-opacity disabled:cursor-wait disabled:opacity-70"
                  style={{
                    border: isAsked ? "1.5px solid #7F77DD" : "1.5px solid hsl(var(--border))",
                    background: isAsked ? "#7F77DD" : "transparent",
                  }}
                >
                  {isAsked ? <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} /> : null}
                </button>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-medium leading-6 text-foreground">{question.text}</p>
                  {isSaving ? <Loader2 className="mt-1 h-4 w-4 flex-shrink-0 animate-spin text-muted-foreground" /> : null}
                </div>

                {linkedMembers.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {linkedMembers.map((member) => {
                      const palette = getMemberPalette(member.id);
                      return (
                        <span
                          key={member.id}
                          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            background: `hsl(${palette.accent} / 0.14)`,
                            color: `hsl(${palette.accent})`,
                            border: `1px solid hsl(${palette.accent} / 0.18)`,
                          }}
                        >
                          {member.nom}
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                {question.asked_at ? (
                  <div className="text-xs text-muted-foreground">Posée le {formatDate(question.asked_at)}</div>
                ) : null}

                {isAsked ? (
                  isEditingAnswer ? (
                    <input
                      id={`answer-${question.id}`}
                      type="text"
                      value={answerValue}
                      onChange={(event) =>
                        setAnswerDrafts((current) => ({ ...current, [question.id]: event.target.value }))
                      }
                      onBlur={() => void handleSaveAnswer(question.id)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          void handleSaveAnswer(question.id);
                        }
                      }}
                      placeholder="Ajouter la réponse reçue..."
                      className="h-10 w-full rounded-lg px-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={answerInputStyle}
                    />
                  ) : question.answer ? (
                    <div style={answerBlockStyle}>
                      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">{question.answer}</p>
                      <button
                        type="button"
                        className="mt-1 text-xs text-secondary underline-offset-4 hover:underline"
                        onClick={() => setEditingAnswerIds((current) => ({ ...current, [question.id]: true }))}
                      >
                        Modifier
                      </button>
                    </div>
                  ) : null
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={glassHeader}>
        <button
          type="button"
          onClick={() => navigate("/outils")}
          className="flex items-center gap-1 text-sm font-medium text-secondary"
        >
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
        <h1 className="text-lg font-semibold text-foreground">Questions à poser</h1>
      </header>

      <main className="flex-1 px-4 pb-28 pt-4">
        <div className="mb-4">
          <button
            type="button"
            onClick={() => navigate("/nouvelle-question")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-4 py-3 text-sm font-medium text-secondary-foreground shadow-sm transition-transform active:scale-[0.98]"
          >
            <Plus size={18} />
            Nouvelle question
          </button>
        </div>

        {loading ? (
          <div className="flex min-h-[320px] items-center justify-center">
            <span className="text-sm text-muted-foreground">Chargement…</span>
          </div>
        ) : !user || !enfantId ? (
          <div className="flex min-h-[320px] items-center justify-center px-6 text-center">
            <p className="max-w-[280px] text-sm text-muted-foreground">
              Connectez-vous et sélectionnez un enfant pour retrouver vos questions.
            </p>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(value) => isQuestionStatus(value) && setActiveTab(value)}>
            <TabsList className="grid w-full grid-cols-2 rounded-2xl bg-muted/80 p-1">
              <TabsTrigger value="to_ask" className="rounded-xl">À poser</TabsTrigger>
              <TabsTrigger value="asked" className="rounded-xl">Posées</TabsTrigger>
            </TabsList>
            <TabsContent value="to_ask" className="mt-4">
              {renderQuestionList(questionsToAsk, "Aucune question en attente pour le moment.")}
            </TabsContent>
            <TabsContent value="asked" className="mt-4">
              {renderQuestionList(askedQuestions, "Aucune question marquée comme posée pour le moment.")}
            </TabsContent>
          </Tabs>
        )}
      </main>

      <BottomNavBar />
    </div>
  );
}
