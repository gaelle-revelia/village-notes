import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BottomNavBar from "@/components/BottomNavBar";
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

type QuestionItem = {
  id: string;
  text: string;
  precisions: string | null;
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
        .select("id, text, precisions, linked_pro_ids, status, answer, created_at, asked_at")
        .eq("parent_id", user.id)
        .eq("child_id", enfantId)
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

  /* ── fetch recent intervenant ids ── */

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
  }, [questions, statusFilter, specFilter, searchQuery, intervenantsById]);

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
                onClick={() => !isExpanded && void openCard(question.id)}
                role={isExpanded ? undefined : "button"}
                tabIndex={isExpanded ? undefined : 0}
                onKeyDown={!isExpanded ? (e) => { if (e.key === "Enter") void openCard(question.id); } : undefined}
              >
                {isExpanded && draft ? (
                  /* ─── EXPANDED MODE ─── */
                  <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                    {/* question label */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium text-muted-foreground">Question</label>
                    </div>

                    {/* question text */}
                    <textarea
                      value={draft.text}
                      onChange={(e) => updateDraft(question.id, "text", e.target.value)}
                      onBlur={() => void flushAndSave(question.id)}
                      onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                      ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                      rows={1}
                      className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-[15px] font-medium text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      style={glassFieldStyle}
                      placeholder="Votre question"
                    />

                    {/* precisions */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Précisions</label>
                      <textarea
                        value={draft.precisions}
                        onChange={(e) => updateDraft(question.id, "precisions", e.target.value)}
                        onBlur={() => void flushAndSave(question.id)}
                        onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                        ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        rows={1}
                        className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        style={glassFieldStyle}
                        placeholder="Contexte complémentaire (optionnel)"
                      />
                    </div>

                    {/* intervenants inline picker */}
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Intervenants</label>

                      {/* selected chips */}
                      {linkedMembers.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {linkedMembers.map((member) => {
                            const palette = getMemberPalette(member.id);
                            return (
                              <div
                                key={member.id}
                                className="inline-flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
                                style={{
                                  backgroundColor: `hsl(${palette.accent} / 0.14)`,
                                  borderColor: `hsl(${palette.accent} / 0.32)`,
                                  color: `hsl(${palette.accent})`,
                                }}
                              >
                                <div
                                  className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[9px] font-semibold text-white"
                                  style={{ background: palette.avatar }}
                                >
                                  {member.nom.charAt(0).toUpperCase()}
                                </div>
                                <span className="max-w-[100px] truncate font-medium">{member.nom}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = draft.linked_pro_ids.filter((id) => id !== member.id);
                                    updateDraft(question.id, "linked_pro_ids", next);
                                  }}
                                  className="inline-flex h-4 w-4 items-center justify-center rounded-full transition-colors hover:bg-foreground/5"
                                  aria-label={`Retirer ${member.nom}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* search */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <input
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Nom ou spécialité..."
                          className="w-full py-2 pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                          style={searchFieldStyle}
                        />
                      </div>

                      {/* results */}
                      {intervenantsArray.length === 0 ? (
                        <p className="text-xs text-muted-foreground">Aucun membre enregistré.</p>
                      ) : pickerSearch.trim() ? (
                        <div className="space-y-1">
                          <p className="px-1 text-xs text-muted-foreground">
                            {filteredIntervenants.length} résultat{filteredIntervenants.length !== 1 ? "s" : ""}
                          </p>
                          {filteredIntervenants.map((m) => (
                            <IntervenantRow
                              key={m.id}
                              intervenant={m}
                              query={pickerSearch}
                              selected={draft.linked_pro_ids.includes(m.id)}
                              onToggle={() => {
                                const next = draft.linked_pro_ids.includes(m.id)
                                  ? draft.linked_pro_ids.filter((id) => id !== m.id)
                                  : [...draft.linked_pro_ids, m.id];
                                updateDraft(question.id, "linked_pro_ids", next);
                              }}
                            />
                          ))}
                          {filteredIntervenants.length === 0 && (
                            <p className="py-2 text-center text-xs text-muted-foreground">Aucun résultat</p>
                          )}
                        </div>
                      ) : null}
                    </div>

                    {/* answer — always visible in edit mode */}
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Réponse reçue</label>
                      <textarea
                        value={draft.answer}
                        onChange={(e) => updateDraft(question.id, "answer", e.target.value)}
                        onBlur={() => void flushAndSave(question.id)}
                        rows={3}
                        className="w-full resize-none rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        style={glassFieldStyle}
                        placeholder="Ajouter la réponse reçue..."
                      />
                    </div>

                    {/* date */}
                    {question.asked_at && (
                      <div className="text-xs text-muted-foreground">
                        Posée le {formatDate(question.asked_at)}
                      </div>
                    )}

                    {isSaving && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}

                    {/* Delete */}
                    {confirmDeleteId === question.id ? (
                      <div className="flex items-center justify-center gap-3 mt-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-muted-foreground" style={{ fontSize: 12 }}>Supprimer définitivement ?</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:underline"
                          style={{ fontSize: 12 }}
                          onClick={() => setConfirmDeleteId(null)}
                        >
                          Annuler
                        </button>
                        <button
                          type="button"
                          className="text-destructive font-medium hover:underline"
                          style={{ fontSize: 12 }}
                          onClick={async () => {
                            await supabase.from("questions").delete().eq("id", question.id);
                            setQuestions((prev) => prev.filter((q) => q.id !== question.id));
                            setEditingId(null);
                            setConfirmDeleteId(null);
                          }}
                        >
                          Supprimer
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="w-full text-center text-destructive hover:underline mt-2"
                        style={{ fontSize: 12 }}
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(question.id); }}
                      >
                        Supprimer cette question
                      </button>
                    )}
                  </div>
                ) : (
                  /* ─── COLLAPSED MODE ─── */
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[15px] font-medium leading-6 text-foreground">{question.text}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                        <span style={{ fontSize: 11, color: "#9A9490", whiteSpace: "nowrap" }}>
                          {formatShortDate(question.created_at)}
                        </span>
                      </div>
                    </div>

                    {question.precisions && (
                      <p className="text-sm leading-5 text-muted-foreground line-clamp-2">{question.precisions}</p>
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
                )}
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
        {/* Row 1: back + title + add */}
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/outils")}
            className="flex items-center justify-center text-secondary"
            aria-label="Retour"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="flex-1 text-lg font-semibold text-foreground">Mes questions</h1>
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
        ) : (
          <div style={{ paddingBottom: 48 }}>
            {renderQuestionList(filteredQuestions, "Aucune question ne correspond aux filtres.")}
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
