import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Bell, CalendarDays, Check, ChevronRight, Loader2, MessageCircleQuestion, Mic, Plus, Search, SlidersHorizontal, Square, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useVocalRecording } from "@/hooks/useVocalRecording";
import { useNavigate } from "react-router-dom";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/* ─────────────── palettes & styles ─────────────── */

const MEMBER_PALETTES = [
  { avatar: "linear-gradient(135deg, hsl(4 68% 66%), hsl(18 76% 63%))", accent: "4 68% 66%" },
  { avatar: "linear-gradient(135deg, hsl(258 58% 67%), hsl(201 62% 60%))", accent: "258 58% 67%" },
  { avatar: "linear-gradient(135deg, hsl(155 42% 47%), hsl(205 52% 55%))", accent: "155 42% 47%" },
  { avatar: "linear-gradient(135deg, hsl(37 78% 60%), hsl(4 68% 66%))", accent: "37 78% 60%" },
  { avatar: "linear-gradient(135deg, hsl(4 68% 66%), hsl(332 50% 57%))", accent: "332 50% 57%" },
  { avatar: "linear-gradient(135deg, hsl(210 18% 61%), hsl(211 28% 49%))", accent: "210 18% 61%" },
  { avatar: "linear-gradient(135deg, hsl(155 42% 47%), hsl(258 58% 67%))", accent: "155 42% 47%" },
  { avatar: "linear-gradient(135deg, hsl(201 62% 60%), hsl(258 58% 67%))", accent: "201 62% 60%" },
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

const glassFieldStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.72)",
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

const answerBlockStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  borderLeft: "2px solid #AFA9EC",
  borderRadius: 8,
  padding: "8px 12px",
};

/* ─────────────── types ─────────────── */

type QuestionStatus = "to_ask" | "asked";

type QuestionType = "rdv" | "rappel" | "question";

type QuestionItem = {
  id: string;
  text: string;
  precisions: string | null;
  linked_pro_ids: string[];
  status: QuestionStatus;
  answer: string | null;
  created_at: string;
  asked_at: string | null;
  type: QuestionType;
  due_date: string | null;
  is_approximate_date: boolean;
  linked_rdv_id: string | null;
  archived_at: string | null;
};

type Member = {
  id: string;
  nom: string;
  specialite: string | null;
};

type Draft = {
  text: string;
  precisions: string;
  linked_pro_ids: string[];
  answer: string;
};

/* ─────────────── helpers ─────────────── */

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

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}

function isQuestionStatus(value: string): value is QuestionStatus {
  return value === "to_ask" || value === "asked";
}

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* ─────────────── sub-components ─────────────── */

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const nText = normalize(text);
  const nQuery = normalize(query);
  const idx = nText.indexOf(nQuery);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-semibold text-secondary">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function IntervenantRow({
  intervenant,
  query,
  selected,
  onToggle,
}: {
  intervenant: Member;
  query: string;
  selected: boolean;
  onToggle: () => void;
}) {
  const palette = getMemberPalette(intervenant.id);
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{
        background: selected ? `hsl(${palette.accent} / 0.08)` : "transparent",
        border: selected ? `1px solid hsl(${palette.accent} / 0.25)` : "1px solid transparent",
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

/* ─────────────── main component ─────────────── */

export default function OutilsQuestions() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();

  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [intervenantsById, setIntervenantsById] = useState<Record<string, Member>>({});
  const [statusFilter, setStatusFilter] = useState<"all" | "to_ask" | "asked">("all");
  const [specFilter, setSpecFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "rdv" | "rappel" | "question">("all");
  const [activeTab, setActiveTab] = useState<"ouvertes" | "archives">("ouvertes");
  const [archivedQuestions, setArchivedQuestions] = useState<QuestionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // inline-edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [pickerSearch, setPickerSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const saveTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const mainRef = useRef<HTMLElement>(null);

  // Vocal recording for answer field
  const {
    isRecording: isAnswerRecording,
    isTranscribing: isAnswerTranscribing,
    error: answerVocalError,
    elapsedSeconds: answerElapsed,
    startRecording: startAnswerRecording,
    stopRecording: stopAnswerRecording,
  } = useVocalRecording("answer_reformulation");
  const answerRecordingTargetRef = useRef<string | null>(null);

  const handleAnswerMicTap = async (questionId: string) => {
    if (isAnswerTranscribing) return;
    if (isAnswerRecording) {
      const text = await stopAnswerRecording();
      if (text && answerRecordingTargetRef.current) {
        const qid = answerRecordingTargetRef.current;
        setDrafts((prev) => {
          const d = prev[qid];
          if (!d) return prev;
          const current = d.answer || "";
          const appended = current ? `${current}\n${text}` : text;
          return { ...prev, [qid]: { ...d, answer: appended } };
        });
        // save after state update
        setQuestions((qs) => {
          const q = qs.find((qq) => qq.id === qid);
          if (q) {
            const updatedAnswer = (drafts[qid]?.answer || "") + (drafts[qid]?.answer ? "\n" : "") + text;
            supabase.from("questions").update({ answer: updatedAnswer }).eq("id", qid).then(() => {});
          }
          return qs;
        });
      }
      answerRecordingTargetRef.current = null;
    } else {
      answerRecordingTargetRef.current = questionId;
      await startAnswerRecording();
    }
  };

  // cleanup timers on unmount
  useEffect(() => {
    const timers = saveTimerRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Scroll to bottom on initial load
  useEffect(() => {
    if (!loading && questions.length > 0) {
      requestAnimationFrame(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" as ScrollBehavior });
      });
    }
  }, [loading, questions.length]);

  /* ── fetch questions + intervenants ── */

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
        .select("id, text, precisions, linked_pro_ids, status, answer, created_at, asked_at, type, due_date, is_approximate_date, linked_rdv_id, archived_at")
        .eq("parent_id", user.id)
        .eq("child_id", enfantId)
        .is("archived_at", null)
        .order("created_at", { ascending: true }),
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
          precisions: item.precisions ?? null,
          linked_pro_ids: Array.isArray(item.linked_pro_ids) ? item.linked_pro_ids : [],
          status: item.status,
          answer: item.answer,
          created_at: item.created_at,
          asked_at: item.asked_at,
          type: (item.type as QuestionType) ?? "question",
          due_date: item.due_date ?? null,
          is_approximate_date: item.is_approximate_date ?? false,
          linked_rdv_id: item.linked_rdv_id ?? null,
          archived_at: item.archived_at ?? null,
        }];
      });

      const initDrafts: Record<string, Draft> = {};
      for (const q of normalizedQuestions) {
        initDrafts[q.id] = {
          text: q.text,
          precisions: q.precisions ?? "",
          linked_pro_ids: [...q.linked_pro_ids],
          answer: q.answer ?? "",
        };
      }

      const membersMap = (intervenantsResult.data ?? []).reduce<Record<string, Member>>((acc, m) => {
        acc[m.id] = m;
        return acc;
      }, {});

      setQuestions(normalizedQuestions);
      setDrafts(initDrafts);
      setIntervenantsById(membersMap);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [authLoading, enfantId, enfantLoading, toast, user]);

  // Fetch archived questions
  useEffect(() => {
    if (activeTab !== "archives" || !user || !enfantId) return;
    supabase
      .from("questions")
      .select("id, text, precisions, linked_pro_ids, status, answer, created_at, asked_at, type, due_date, is_approximate_date, linked_rdv_id, archived_at")
      .eq("parent_id", user.id)
      .eq("child_id", enfantId)
      .not("archived_at", "is", null)
      .order("archived_at", { ascending: false })
      .then(({ data }) => {
        if (!data) { setArchivedQuestions([]); return; }
        setArchivedQuestions(data.flatMap((item) => {
          if (!isQuestionStatus(item.status)) return [];
          return [{
            id: item.id,
            text: item.text,
            precisions: item.precisions ?? null,
            linked_pro_ids: Array.isArray(item.linked_pro_ids) ? item.linked_pro_ids : [],
            status: item.status,
            answer: item.answer,
            created_at: item.created_at,
            asked_at: item.asked_at,
            type: (item.type as QuestionType) ?? "question",
            due_date: item.due_date ?? null,
            is_approximate_date: item.is_approximate_date ?? false,
            linked_rdv_id: item.linked_rdv_id ?? null,
            archived_at: item.archived_at ?? null,
          }];
        }));
      });
  }, [activeTab, user, enfantId]);


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

  /* ── derived data ── */

  const intervenantsArray = useMemo(
    () => Object.values(intervenantsById),
    [intervenantsById],
  );

  const availableSpecialties = useMemo(() => {
    const specs = new Set<string>();
    for (const q of questions) {
      for (const pid of q.linked_pro_ids) {
        const m = intervenantsById[pid];
        if (m?.specialite) specs.add(m.specialite);
      }
    }
    return Array.from(specs).sort();
  }, [questions, intervenantsById]);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (typeFilter !== "all" && q.type !== typeFilter) return false;
      if (statusFilter === "to_ask" && q.answer && q.answer.trim() !== "") return false;
      if (statusFilter === "asked" && (!q.answer || q.answer.trim() === "")) return false;
      if (specFilter) {
        const hasSpec = q.linked_pro_ids.some((id) => intervenantsById[id]?.specialite === specFilter);
        if (!hasSpec) return false;
      }
      if (searchQuery.trim()) {
        const n = normalize(searchQuery);
        const matchText = normalize(q.text).includes(n);
        const matchPrec = q.precisions && normalize(q.precisions).includes(n);
        const matchAnswer = q.answer && normalize(q.answer).includes(n);
        if (!matchText && !matchPrec && !matchAnswer) return false;
      }
      return true;
    });
  }, [questions, statusFilter, specFilter, searchQuery, intervenantsById, typeFilter]);

  /* ── save helpers ── */

  const updateQuestionLocally = useCallback((questionId: string, updates: Partial<QuestionItem>) => {
    setQuestions((current) =>
      current.map((q) => (q.id === questionId ? { ...q, ...updates } : q)),
    );
  }, []);

  const flushAndSave = useCallback(async (questionId: string) => {
    // clear all pending timers for this question
    for (const key of Object.keys(saveTimerRef.current)) {
      if (key.startsWith(questionId)) {
        clearTimeout(saveTimerRef.current[key]);
        delete saveTimerRef.current[key];
      }
    }

    const draft = drafts[questionId];
    const question = questions.find((q) => q.id === questionId);
    if (!draft || !question) return;

    const updates: Record<string, unknown> = {};
    if (draft.text.trim() && draft.text.trim() !== question.text) updates.text = draft.text.trim();
    if ((draft.precisions.trim() || null) !== (question.precisions ?? null))
      updates.precisions = draft.precisions.trim() || null;
    if (JSON.stringify(draft.linked_pro_ids) !== JSON.stringify(question.linked_pro_ids))
      updates.linked_pro_ids = draft.linked_pro_ids;
    if ((draft.answer.trim() || null) !== (question.answer ?? null))
      updates.answer = draft.answer.trim() || null;

    if (Object.keys(updates).length === 0) return;

    const { error } = await supabase
      .from("questions")
      .update(updates)
      .eq("id", questionId);

    if (error) {
      toast({
        title: "Impossible d'enregistrer les modifications",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }

    updateQuestionLocally(questionId, updates as Partial<QuestionItem>);
  }, [drafts, questions, toast, updateQuestionLocally]);

  const scheduleSave = useCallback((questionId: string, field: string) => {
    const key = `${questionId}:${field}`;
    if (saveTimerRef.current[key]) clearTimeout(saveTimerRef.current[key]);
    saveTimerRef.current[key] = setTimeout(() => {
      delete saveTimerRef.current[key];
      void flushAndSave(questionId);
    }, 800);
  }, [flushAndSave]);

  const updateDraft = useCallback((questionId: string, field: keyof Draft, value: string | string[]) => {
    setDrafts((prev) => ({
      ...prev,
      [questionId]: { ...prev[questionId], [field]: value },
    }));
    scheduleSave(questionId, field);
  }, [scheduleSave]);

  /* ── card open / close ── */

  const openCard = useCallback(async (questionId: string) => {
    if (editingId && editingId !== questionId) {
      await flushAndSave(editingId);
    }
    setPickerSearch("");
    setEditingId(questionId);
  }, [editingId, flushAndSave]);

  const closeCard = useCallback(async () => {
    if (editingId) {
      await flushAndSave(editingId);
    }
    setEditingId(null);
    setPickerSearch("");
  }, [editingId, flushAndSave]);

  /* ── click outside ── */

  const handleMainClick = useCallback((e: React.MouseEvent<HTMLElement>) => {
    // Close filter panel on outside click
    if (filterPanelOpen) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-filter-header]")) {
        setFilterPanelOpen(false);
      }
    }
    if (!editingId) return;
    const target = e.target as HTMLElement;
    if (target.closest(`[data-question-id="${editingId}"]`)) return;
    void closeCard();
  }, [editingId, closeCard, filterPanelOpen]);




  /* ── inline intervenant picker helpers ── */

  const filteredIntervenants = useMemo(() => {
    if (!pickerSearch.trim()) return [];
    const q = normalize(pickerSearch);
    return intervenantsArray.filter(
      (m) => normalize(m.nom).includes(q) || (m.specialite && normalize(m.specialite).includes(q)),
    );
  }, [intervenantsArray, pickerSearch]);

  const recentIntervenants = useMemo(() => {
    if (recentIds.length > 0) {
      return recentIds
        .map((id) => intervenantsById[id])
        .filter(Boolean) as Member[];
    }
    return intervenantsArray.slice(0, 3);
  }, [intervenantsArray, recentIds, intervenantsById]);

  /* ─────────────── render question list ─────────────── */

  const renderQuestionList = (items: QuestionItem[], emptyLabel: string) => {
    if (items.length === 0) {
      return (
        <div className="flex min-h-[260px] items-center justify-center px-6 text-center">
          <p className="max-w-[260px] text-sm text-muted-foreground">{emptyLabel}</p>
        </div>
      );
    }

    return (
      <div className="relative" style={{ paddingLeft: 44 }}>
        {/* Vertical timeline line */}
        <div
          className="absolute top-0 bottom-0"
          style={{
            left: 16,
            width: 1.5,
            background: "linear-gradient(180deg, rgba(232,115,106,0.4) 0%, rgba(139,116,224,0.4) 50%, rgba(68,168,130,0.3) 100%)",
            borderRadius: 2,
          }}
        />

        {items.map((question) => {
          const isExpanded = editingId === question.id;
          const draft = drafts[question.id];
          const linkedMembers = (draft?.linked_pro_ids ?? question.linked_pro_ids)
            .map((mid) => intervenantsById[mid])
            .filter(Boolean);
          const isSaving = savingId === question.id;
          const isAsked = question.status === "asked";
          const hasFill = isAsked || !!question.answer;

          const dotStyle: React.CSSProperties = hasFill
            ? {
                left: -32,
                marginTop: 18,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "#8B74E0",
                boxShadow: "0 0 0 3px rgba(139,116,224,0.24)",
                zIndex: 1,
              }
            : {
                left: -32,
                marginTop: 18,
                width: 11,
                height: 11,
                borderRadius: "50%",
                background: "rgba(255,255,255,0.7)",
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                border: "2.5px solid #8A9BAE",
                boxShadow: "0 0 0 3px rgba(138,155,174,0.16)",
                zIndex: 1,
              };

          return (
            <div key={question.id} className="relative" style={{ marginBottom: 16 }}>
              {/* Timeline dot */}
              <div className="absolute" style={dotStyle} />

              <article
                data-question-id={question.id}
                className="p-4 transition-all"
                style={{
                  ...glassCard,
                  ...(isAsked ? { borderLeft: "3px solid #8B74E0" } : {}),
                }}
                onClick={() => navigate(`/a-venir/${question.id}`)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/a-venir/${question.id}`); }}
              >
                {/* ─── COLLAPSED MODE ─── */}
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p style={{ fontSize: 14, fontWeight: 500 }} className="leading-5 text-foreground">{question.text}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <span style={{ fontSize: 11, color: "#9A9490", whiteSpace: "nowrap" }}>
                          {formatShortDate(question.created_at)}
                        </span>
                      </div>
                    </div>

                    {question.precisions && (
                      <p style={{ fontSize: 13 }} className="leading-5 text-muted-foreground line-clamp-2">{question.precisions}</p>
                    )}

                    {linkedMembers.length > 0 && (
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
                    )}

                    {/* Answer indicator */}
                    {question.answer && (
                      <div className="flex items-center gap-1.5 pt-1">
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#7F77DD" }} />
                        <span style={{ fontSize: 11, fontWeight: 500, color: "#534AB7" }}>Réponse enregistrée</span>
                      </div>
                    )}
                  </div>
              </article>
            </div>
          );
        })}
      </div>
    );
  };

  /* ─────────────── page layout ─────────────── */

  return (
    <div className="flex min-h-screen flex-col">
      <header data-filter-header className="sticky top-0 z-10 px-4" style={glassHeader}>
        {/* Row 1: title + avatar */}
        <div className="flex items-center justify-between py-3">
          <h1 style={{ fontFamily: "Fraunces, serif", fontSize: 28, fontWeight: 700 }} className="text-foreground">À venir</h1>
          <ProfileAvatar />
        </div>
        {/* Tab row */}
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.45)",
          borderRadius: 12,
          padding: 3,
          marginBottom: 8,
        }}>
          {([
            { key: "ouvertes" as const, label: "Ouvertes" },
            { key: "archives" as const, label: "Archives" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              style={{
                flex: 1,
                padding: "6px 0",
                borderRadius: 10,
                fontSize: 13,
                fontWeight: activeTab === key ? 500 : 400,
                color: activeTab === key ? "#534AB7" : "#9A9490",
                background: activeTab === key ? "#fff" : "transparent",
                boxShadow: activeTab === key ? "0 1px 4px rgba(139,116,224,0.15)" : "none",
                border: "none",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {/* Type filter chips — only for ouvertes tab */}
        {activeTab === "ouvertes" && (<>
        <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {([
            { key: "all" as const, label: "Tout" },
            { key: "rdv" as const, label: "Rendez-vous" },
            { key: "rappel" as const, label: "Rappels" },
            { key: "question" as const, label: "Questions" },
          ]).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTypeFilter(key)}
              className="px-3.5 py-1.5 rounded-[20px] text-xs font-medium transition-all whitespace-nowrap flex-shrink-0"
              style={typeFilter === key
                ? { background: "#8B74E0", color: "#fff", boxShadow: "0 2px 8px rgba(139,116,224,0.25)" }
                : { background: "rgba(255,255,255,0.52)", border: "1px solid rgba(255,255,255,0.72)", color: "#1E1A1A" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Row 2: filter button + search field */}
        <div className="flex items-center gap-2 pb-2">
          <button
            type="button"
            onClick={() => setFilterPanelOpen((v) => !v)}
            className="relative flex flex-shrink-0 items-center justify-center"
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              background: filterPanelOpen ? "hsl(var(--background) / 0.6)" : "hsl(var(--background) / 0.45)",
              backdropFilter: "blur(12px) saturate(1.4)",
              WebkitBackdropFilter: "blur(12px) saturate(1.4)",
              border: "1px solid hsl(var(--background) / 0.65)",
              boxShadow: "0 2px 8px hsl(var(--foreground) / 0.05), inset 0 1px 0 hsl(var(--background) / 0.7)",
            }}
            aria-label="Filtrer"
          >
            <SlidersHorizontal
              size={16}
              style={{ color: (statusFilter !== "all" || specFilter !== null) ? "#8B74E0" : "#9A9490" }}
            />
            {(statusFilter !== "all" || specFilter !== null) && (
              <span
                className="absolute"
                style={{
                  top: 8,
                  right: 8,
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#8B74E0",
                }}
              />
            )}
          </button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher…"
              className="w-full py-2 pl-9 pr-8 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              style={searchFieldStyle}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Effacer la recherche"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Collapsible filter panel */}
        <div
          style={{
            overflow: "hidden",
            maxHeight: filterPanelOpen ? 300 : 0,
            transition: "max-height 0.25s ease",
          }}
        >
          {/* Status chips */}
          <div className="pb-2">
            <p style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>Statut</p>
            <div className="flex flex-wrap gap-2">
              {([
                { key: "all" as const, label: "Toutes" },
                { key: "to_ask" as const, label: "À poser" },
                { key: "asked" as const, label: "Posées" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStatusFilter(key)}
                  className="px-3.5 py-1.5 rounded-[20px] text-xs font-medium transition-all"
                  style={statusFilter === key
                    ? { background: "#8B74E0", color: "#fff", boxShadow: "0 2px 8px rgba(139,116,224,0.25)" }
                    : { background: "rgba(255,255,255,0.52)", border: "1px solid rgba(255,255,255,0.72)", color: "#1E1A1A" }
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Specialty chips */}
          {availableSpecialties.length > 1 && (
            <div className="pb-2">
              <p style={{ fontSize: 11, fontWeight: 500, color: "hsl(var(--muted-foreground))", marginBottom: 6 }}>Intervenant</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSpecFilter(null)}
                  className="px-3.5 py-1.5 rounded-[20px] text-xs font-medium transition-all"
                  style={specFilter === null
                    ? { background: "#8B74E0", color: "#fff", boxShadow: "0 2px 8px rgba(139,116,224,0.25)" }
                    : { background: "rgba(255,255,255,0.52)", border: "1px solid rgba(255,255,255,0.72)", color: "#1E1A1A" }
                  }
                >
                  Toutes
                </button>
                {availableSpecialties.map((spec) => (
                  <button
                    key={spec}
                    type="button"
                    onClick={() => setSpecFilter(specFilter === spec ? null : spec)}
                    className="px-3.5 py-1.5 rounded-[20px] text-xs font-medium transition-all"
                    style={specFilter === spec
                      ? { background: "#8B74E0", color: "#fff", boxShadow: "0 2px 8px rgba(139,116,224,0.25)" }
                      : { background: "rgba(255,255,255,0.52)", border: "1px solid rgba(255,255,255,0.72)", color: "#1E1A1A" }
                    }
                  >
                    {spec}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Reset button */}
          {(statusFilter !== "all" || specFilter !== null) && (
            <div className="pb-2 flex justify-end">
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setSpecFilter(null); }}
                className="text-xs font-medium"
                style={{ color: "#8B74E0" }}
              >
                Réinitialiser
              </button>
            </div>
          )}
        </div>
        </>)}
      </header>

      <main ref={mainRef} className="flex-1 px-4 pb-28 pt-4" onClick={handleMainClick}>
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
        ) : activeTab === "archives" ? (
          <div style={{ paddingBottom: 48 }}>
            {archivedQuestions.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <p style={{ color: "#9A9490", fontSize: 14 }}>Aucune boucle archivée</p>
              </div>
            ) : (() => {
              const monthLabelStyle: CSSProperties = {
                fontSize: 11,
                fontWeight: 600,
                color: "#9A9490",
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                marginTop: 14,
                marginBottom: 8,
              };

              // Group by month from archived_at
              const groups = new Map<string, QuestionItem[]>();
              for (const q of archivedQuestions) {
                const d = new Date(q.archived_at!);
                const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
                if (!groups.has(key)) groups.set(key, []);
                groups.get(key)!.push(q);
              }

              return Array.from(groups.entries()).map(([key, items]) => {
                const [y, m] = key.split("-");
                const label = format(new Date(Number(y), Number(m), 1), "MMMM yyyy", { locale: fr }).toUpperCase();
                return (
                  <div key={key}>
                    <p style={monthLabelStyle}>{label}</p>
                    <div className="relative" style={{ paddingLeft: 44 }}>
                      <div
                        className="absolute top-0 bottom-0"
                        style={{
                          left: 16,
                          width: 1.5,
                          background: "linear-gradient(180deg, rgba(154,148,144,0.2) 0%, rgba(154,148,144,0.1) 100%)",
                          borderRadius: 2,
                        }}
                      />
                      {items.map((q) => {
                        const typeBadge = q.type === "rdv" ? "RDV" : q.type === "rappel" ? "Rappel" : "Question";
                        return (
                          <div key={q.id} className="relative cursor-pointer" style={{ marginBottom: 12, opacity: 0.6 }} onClick={() => navigate(`/a-venir/${q.id}`)}>
                            <div
                              className="absolute"
                              style={{
                                left: -32,
                                marginTop: 14,
                                width: 11,
                                height: 11,
                                borderRadius: "50%",
                                background: "rgba(255,255,255,0.7)",
                                border: "2px solid #9A9490",
                                zIndex: 1,
                              }}
                            />
                            <div style={{
                              ...glassCard,
                              padding: "12px 14px",
                            }}>
                              <div className="flex items-center gap-2 mb-1">
                                <span style={{
                                  fontSize: 10,
                                  fontWeight: 500,
                                  color: "#9A9490",
                                  background: "rgba(154,148,144,0.1)",
                                  padding: "2px 8px",
                                  borderRadius: 8,
                                }}>{typeBadge}</span>
                              </div>
                              <p style={{
                                fontSize: 14,
                                fontWeight: 500,
                                color: "#1E1A1A",
                                textDecoration: "line-through",
                                lineHeight: 1.4,
                              }}>{q.text}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        ) : (
          <div style={{ paddingBottom: 48 }}>
            {(() => {
              const today = new Date();
              const in7days = new Date(today);
              in7days.setDate(today.getDate() + 7);

              const aTraiter = filteredQuestions.filter(q => q.due_date && new Date(q.due_date) <= in7days);
              const planifiees = filteredQuestions.filter(q => q.due_date && new Date(q.due_date) > in7days);
              const sansDate = filteredQuestions.filter(q => !q.due_date);

              if (aTraiter.length === 0 && planifiees.length === 0 && sansDate.length === 0) {
                return (
                  <div className="flex items-center justify-center py-16">
                    <p style={{ color: "#9A9490", fontSize: 14 }}>Aucune boucle ouverte</p>
                  </div>
                );
              }

              const sectionLabelStyle: CSSProperties = {
                fontSize: 11,
                fontWeight: 600,
                color: "#9A9490",
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
                marginTop: 16,
                marginBottom: 8,
              };

              return (
                <>
                  {aTraiter.length > 0 && (
                    <>
                      <p style={sectionLabelStyle}>À traiter</p>
                      {renderQuestionList(aTraiter, "")}
                    </>
                  )}
                  {planifiees.length > 0 && (
                    <>
                      <p style={sectionLabelStyle}>Planifiées</p>
                      {renderQuestionList(planifiees, "")}
                    </>
                  )}
                  {sansDate.length > 0 && (
                    <>
                      <p style={sectionLabelStyle}>Sans date</p>
                      {renderQuestionList(sansDate, "")}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>

      <BottomNavBar />

      {/* FAB */}
      <button
        type="button"
        onClick={() => navigate("/nouvelle-question")}
        className="fixed z-20 flex items-center justify-center"
        style={{
          bottom: 96,
          right: 20,
          width: 46,
          height: 46,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #E8736A, #8B74E0)",
          boxShadow: "0 4px 16px rgba(139,116,224,0.35), 0 2px 6px rgba(232,115,106,0.25)",
        }}
        aria-label="Nouvelle question"
      >
        <Plus size={22} className="text-white" />
      </button>
    </div>
  );
}
