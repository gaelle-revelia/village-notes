import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Mic, Square, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { IntervenantSearchPicker } from "@/components/memo/IntervenantSearchPicker";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { useVocalRecording } from "@/hooks/useVocalRecording";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import BottomNavBar from "@/components/BottomNavBar";

/* ─── types ─── */

type BoucleType = "rdv" | "rappel" | "question";

type BoucleItem = {
  id: string;
  type: BoucleType;
  text: string;
  precisions: string | null;
  linked_pro_ids: string[];
  due_date: string | null;
  is_approximate_date: boolean;
  linked_rdv_id: string | null;
  archived_at: string | null;
  answer: string | null;
  child_id: string;
};

/* ─── styles ─── */

const glassHeader: CSSProperties = {
  background: "hsl(var(--background) / 0.72)",
  backdropFilter: "blur(20px) saturate(1.5)",
  WebkitBackdropFilter: "blur(20px) saturate(1.5)",
  borderBottom: "1px solid hsl(var(--border) / 0.6)",
  boxShadow: "0 2px 12px hsl(var(--foreground) / 0.05)",
};

const glassCard: CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: 16,
  padding: "16px 20px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
};

const sectionLabel: CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "#9A9490",
  marginBottom: 8,
};

const glassFieldStyle: CSSProperties = {
  background: "rgba(255,255,255,0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.72)",
};

const TYPE_CONFIG: Record<BoucleType, { label: string; bg: string; color: string }> = {
  rdv: { label: "RDV", bg: "#EEEDFE", color: "#534AB7" },
  rappel: { label: "Rappel", bg: "#FAEEDA", color: "#854F0B" },
  question: { label: "Question", bg: "#E1F5EE", color: "#0F6E56" },
};

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

/* ─── component ─── */

export default function AVenirDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { enfantId, loading: enfantLoading } = useEnfantId();
  const { toast } = useToast();

  const [item, setItem] = useState<BoucleItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Linked questions (RDV type)
  const [linkedQuestions, setLinkedQuestions] = useState<{ id: string; text: string; type: string }[]>([]);
  const [allQuestions, setAllQuestions] = useState<{ id: string; text: string; type: string }[]>([]);
  const [questionSearch, setQuestionSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Draft fields
  const [draftText, setDraftText] = useState("");
  const [draftPrecisions, setDraftPrecisions] = useState("");
  const [draftAnswer, setDraftAnswer] = useState("");

  // Vocal
  const {
    isRecording, isTranscribing, startRecording, stopRecording,
  } = useVocalRecording("answer_reformulation");
  const vocalTargetRef = useRef<"text" | "precisions" | "answer" | null>(null);

  /* ── fetch ── */

  useEffect(() => {
    if (authLoading || enfantLoading || !id) return;
    if (!user) { navigate("/a-venir"); return; }

    supabase
      .from("questions")
      .select("id, text, precisions, linked_pro_ids, due_date, is_approximate_date, linked_rdv_id, archived_at, answer, child_id, type")
      .eq("id", id)
      .single()
      .then(async ({ data, error }) => {
        if (error || !data) { navigate("/a-venir"); return; }
        const b: BoucleItem = {
          id: data.id,
          type: (data.type as BoucleType) ?? "question",
          text: data.text,
          precisions: data.precisions ?? null,
          linked_pro_ids: Array.isArray(data.linked_pro_ids) ? data.linked_pro_ids : [],
          due_date: data.due_date ?? null,
          is_approximate_date: data.is_approximate_date ?? false,
          linked_rdv_id: data.linked_rdv_id ?? null,
          archived_at: data.archived_at ?? null,
          answer: data.answer ?? null,
          child_id: data.child_id,
        };
        setItem(b);
        setDraftText(b.text);
        setDraftPrecisions(b.precisions ?? "");
        setDraftAnswer(b.answer ?? "");
        setLoading(false);

        if (data.type === "rdv") {
          const { data: linked } = await supabase
            .from("questions")
            .select("id, text, type")
            .eq("linked_rdv_id", id)
            .is("archived_at", null);
          if (linked) setLinkedQuestions(linked);
          const { data: all } = await supabase
            .from("questions")
            .select("id, text, type")
            .eq("child_id", data.child_id)
            .in("type", ["question", "rappel"])
            .is("archived_at", null)
            .is("linked_rdv_id", null);
          if (all) setAllQuestions(all);
        }
      });
  }, [id, user, authLoading, enfantLoading, navigate]);

  /* ── auto-save ── */

  const autoSave = useCallback(async (updates: Record<string, unknown>) => {
    if (!item) return;
    const { error } = await supabase.from("questions").update(updates).eq("id", item.id);
    if (error) {
      toast({ title: "Erreur de sauvegarde", variant: "destructive" });
      return;
    }
    setItem((prev) => prev ? { ...prev, ...updates } as BoucleItem : prev);
  }, [item, toast]);

  /* ── handlers ── */

  const handleDateChange = useCallback((d: Date) => {
    const iso = format(d, "yyyy-MM-dd");
    autoSave({ due_date: iso });
  }, [autoSave]);

  const handleIntervenantChange = useCallback((proId: string | null) => {
    const ids = proId ? [proId] : [];
    autoSave({ linked_pro_ids: ids });
  }, [autoSave]);

  const handleApproxToggle = useCallback((val: boolean) => {
    autoSave({ is_approximate_date: val });
  }, [autoSave]);

  const handleDelete = useCallback(async () => {
    if (!item) return;
    await supabase.from("questions").delete().eq("id", item.id);
    navigate("/a-venir");
  }, [item, navigate]);

  const handleArchive = useCallback(async () => {
    if (!item) return;
    await supabase.from("questions").update({ archived_at: new Date().toISOString() }).eq("id", item.id);
    navigate("/a-venir");
  }, [item, navigate]);

  const handleReopen = useCallback(async () => {
    if (!item) return;
    await supabase.from("questions").update({ archived_at: null }).eq("id", item.id);
    navigate("/a-venir");
  }, [item, navigate]);

  /* ── vocal ── */

  const handleMicTap = async (field: "text" | "precisions" | "answer") => {
    if (isTranscribing) return;
    if (isRecording) {
      const text = await stopRecording();
      if (text && vocalTargetRef.current) {
        const target = vocalTargetRef.current;
        if (target === "text") {
          const updated = draftText ? `${draftText}\n${text}` : text;
          setDraftText(updated);
          autoSave({ text: updated });
        } else if (target === "precisions") {
          const updated = draftPrecisions ? `${draftPrecisions}\n${text}` : text;
          setDraftPrecisions(updated);
          autoSave({ precisions: updated || null });
        } else if (target === "answer") {
          const updated = draftAnswer ? `${draftAnswer}\n${text}` : text;
          setDraftAnswer(updated);
          autoSave({ answer: updated || null });
        }
      }
      vocalTargetRef.current = null;
    } else {
      vocalTargetRef.current = field;
      await startRecording();
    }
  };

  /* ── approximate date UI ── */

  const renderApproxDatePicker = () => {
    if (!item) return null;
    const current = item.due_date ? new Date(item.due_date) : new Date();
    const currentMonth = current.getMonth();
    const currentYear = current.getFullYear();

    return (
      <div className="flex gap-3">
        <select
          value={currentMonth}
          onChange={(e) => {
            const d = new Date(currentYear, Number(e.target.value), 1);
            handleDateChange(d);
          }}
          className="flex-1 rounded-lg px-3 py-2.5 text-sm outline-none"
          style={glassFieldStyle}
        >
          {MONTHS.map((m, i) => (
            <option key={i} value={i}>{m}</option>
          ))}
        </select>
        <select
          value={currentYear}
          onChange={(e) => {
            const d = new Date(Number(e.target.value), currentMonth, 1);
            handleDateChange(d);
          }}
          className="w-24 rounded-lg px-3 py-2.5 text-sm outline-none"
          style={glassFieldStyle}
        >
          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>
    );
  };

  /* ── mic button helper ── */

  const MicButton = ({ field }: { field: "text" | "precisions" | "answer" }) => {
    const isActive = isRecording && vocalTargetRef.current === field;
    return (
      <button
        type="button"
        onClick={() => handleMicTap(field)}
        className="flex-shrink-0 flex items-center justify-center rounded-full"
        style={{
          width: 32, height: 32,
          background: isActive ? "rgba(232,115,106,0.15)" : "rgba(139,116,224,0.08)",
          border: isActive ? "1px solid rgba(232,115,106,0.3)" : "1px solid rgba(139,116,224,0.15)",
        }}
      >
        {isTranscribing && vocalTargetRef.current === field ? (
          <Loader2 size={14} className="animate-spin" style={{ color: "#8B74E0" }} />
        ) : isActive ? (
          <Square size={12} style={{ color: "#E8736A" }} />
        ) : (
          <Mic size={14} style={{ color: "#8B74E0" }} />
        )}
      </button>
    );
  };

  /* ── loading / guard ── */

  if (loading || authLoading || enfantLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!item) return null;

  const cfg = TYPE_CONFIG[item.type];
  const isArchived = !!item.archived_at;

  /* ─── render ─── */

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-4 py-3" style={glassHeader}>
        <button type="button" onClick={() => navigate("/a-venir")} className="p-1">
          <ArrowLeft size={22} className="text-foreground" />
        </button>
        <span
          className="rounded-full px-3 py-1 text-xs font-medium"
          style={{ background: cfg.bg, color: cfg.color }}
        >
          {cfg.label}
        </span>
        <button type="button" onClick={() => setDeleteModalOpen(true)} className="p-1">
          <Trash2 size={18} style={{ color: "#E8736A" }} />
        </button>
      </header>

      <main className="flex-1 space-y-4 px-4 pb-28 pt-4">
        {/* Archived banner */}
        {isArchived && item.archived_at && (
          <div
            className="mx-auto text-center text-xs font-medium"
            style={{
              background: "rgba(139,116,224,0.08)",
              color: "#534AB7",
              borderRadius: 20,
              padding: "6px 16px",
              marginBottom: 16,
            }}
          >
            Clôturée le {format(new Date(item.archived_at), "d MMMM yyyy", { locale: fr })}
          </div>
        )}

        {/* ── RDV type ── */}
        {item.type === "rdv" && (
          <>
            {/* Titre */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>TITRE</p>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={() => { if (draftText.trim() !== item.text) autoSave({ text: draftText.trim() }); }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={1}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-[15px] font-medium text-foreground outline-none"
                style={glassFieldStyle}
              />
            </div>

            {/* Date */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>DATE</p>
              <MemoDatePicker
                date={item.due_date ? new Date(item.due_date) : new Date()}
                onDateChange={handleDateChange}
              />
            </div>

            {/* Professionnel */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>PROFESSIONNEL</p>
              <IntervenantSearchPicker
                enfantId={enfantId}
                value={item.linked_pro_ids[0] || null}
                onChange={handleIntervenantChange}
              />
            </div>

            {/* Questions liées */}
            <div style={glassCard} className="space-y-3">
              <p style={sectionLabel}>QUESTIONS LIÉES</p>
              {linkedQuestions.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  {linkedQuestions.map((q) => (
                    <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(139,116,224,0.08)", border: "1px solid rgba(139,116,224,0.2)", borderRadius: 12, padding: "10px 12px", marginBottom: 6, cursor: "pointer" }}
                      onClick={() => navigate(`/a-venir/${q.id}`)}>
                      <span style={{ flex: 1, fontSize: 13, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>{q.text}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9A9490" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
                      <button onClick={async (e) => { e.stopPropagation(); await supabase.from("questions").update({ linked_rdv_id: null }).eq("id", q.id); setLinkedQuestions(prev => prev.filter(x => x.id !== q.id)); setAllQuestions(prev => [...prev, q]); }} style={{ background: "none", border: "none", color: "#9A9490", cursor: "pointer", padding: 0, fontSize: 16, lineHeight: 1 }}>×</button>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Rechercher ou créer une question..."
                  value={questionSearch}
                  onChange={(e) => { setQuestionSearch(e.target.value); setShowDropdown(true); }}
                  onFocus={() => setShowDropdown(true)}
                  onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
                  style={{ width: "100%", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(139,116,224,0.3)", borderRadius: 10, padding: "8px 11px", fontSize: 13, fontFamily: "'DM Sans', sans-serif", color: "#1E1A1A", boxSizing: "border-box" as const }}
                />
                {showDropdown && questionSearch.trim() && (
                  <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "rgba(255,255,255,0.97)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: 12, zIndex: 50, boxShadow: "0 4px 16px rgba(0,0,0,0.08)", overflow: "hidden" }}>
                    {allQuestions.filter(q => q.text.toLowerCase().includes(questionSearch.toLowerCase())).slice(0, 5).map(q => (
                      <div key={q.id}
                        onMouseDown={async () => {
                          await supabase.from("questions").update({ linked_rdv_id: item.id }).eq("id", q.id);
                          setLinkedQuestions(prev => [...prev, q]);
                          setAllQuestions(prev => prev.filter(x => x.id !== q.id));
                          setQuestionSearch("");
                          setShowDropdown(false);
                        }}
                        style={{ padding: "9px 12px", fontSize: 12, color: "#1E1A1A", display: "flex", alignItems: "center", gap: 7, borderBottom: "1px solid rgba(0,0,0,0.04)", cursor: "pointer" }}>
                        <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 6px", borderRadius: 20, background: q.type === "question" ? "#E1F5EE" : "#FAEEDA", color: q.type === "question" ? "#0F6E56" : "#854F0B", flexShrink: 0 }}>
                          {q.type === "question" ? "Question" : "To-Do"}
                        </span>
                        {q.text}
                      </div>
                    ))}
                    {allQuestions.filter(q => q.text.toLowerCase().includes(questionSearch.toLowerCase())).length === 0 && (
                      <div
                        onMouseDown={async () => {
                          const { data: newQ } = await supabase.from("questions").insert({ text: questionSearch.trim(), type: "question", child_id: item.child_id, parent_id: user?.id ?? "", linked_rdv_id: item.id, status: "to_ask", archived_at: null, linked_pro_ids: [] }).select("id, text, type").single();
                          if (newQ) setLinkedQuestions(prev => [...prev, newQ]);
                          setQuestionSearch("");
                          setShowDropdown(false);
                        }}
                        style={{ padding: "9px 12px", fontSize: 12, color: "#8B74E0", fontWeight: 500, display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
                        <span style={{ fontSize: 14 }}>+</span> Créer &quot;{questionSearch.trim()}&quot;
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── RAPPEL type ── */}
        {item.type === "rappel" && (
          <>
            {/* Titre */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>TITRE</p>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={() => { if (draftText.trim() !== item.text) autoSave({ text: draftText.trim() }); }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={1}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-[15px] font-medium text-foreground outline-none"
                style={glassFieldStyle}
              />
            </div>

            {/* Date + approx toggle */}
            <div style={glassCard} className="space-y-3">
              <p style={sectionLabel}>DATE</p>
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => handleApproxToggle(!item.is_approximate_date)}
                  className="flex items-center gap-2 text-xs"
                  style={{ color: item.is_approximate_date ? "#534AB7" : "#9A9490" }}
                >
                  <div
                    className="rounded-full"
                    style={{
                      width: 16, height: 16,
                      border: `2px solid ${item.is_approximate_date ? "#534AB7" : "#9A9490"}`,
                      background: item.is_approximate_date ? "#534AB7" : "transparent",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    {item.is_approximate_date && (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />
                    )}
                  </div>
                  Date approximative
                </button>
              </div>
              {item.is_approximate_date ? renderApproxDatePicker() : (
                <MemoDatePicker
                  date={item.due_date ? new Date(item.due_date) : new Date()}
                  onDateChange={handleDateChange}
                />
              )}
            </div>

            {/* Professionnel */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>PROFESSIONNEL</p>
              <IntervenantSearchPicker
                enfantId={enfantId}
                value={item.linked_pro_ids[0] || null}
                onChange={handleIntervenantChange}
              />
            </div>

            {/* Précisions */}
            <div style={glassCard} className="space-y-2">
              <div className="flex items-center justify-between">
                <p style={sectionLabel}>PRÉCISIONS</p>
                <MicButton field="precisions" />
              </div>
              <textarea
                value={draftPrecisions}
                onChange={(e) => setDraftPrecisions(e.target.value)}
                onBlur={() => {
                  const val = draftPrecisions.trim() || null;
                  if (val !== (item.precisions ?? null)) autoSave({ precisions: val });
                }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={2}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                style={glassFieldStyle}
                placeholder="Ajouter des précisions…"
              />
            </div>
          </>
        )}

        {/* ── QUESTION type ── */}
        {item.type === "question" && (
          <>
            {/* Question */}
            <div style={glassCard} className="space-y-2">
              <div className="flex items-center justify-between">
                <p style={sectionLabel}>QUESTION</p>
                <MicButton field="text" />
              </div>
              <textarea
                value={draftText}
                onChange={(e) => setDraftText(e.target.value)}
                onBlur={() => { if (draftText.trim() !== item.text) autoSave({ text: draftText.trim() }); }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={1}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-[15px] font-medium text-foreground outline-none"
                style={glassFieldStyle}
                placeholder="La question"
              />
            </div>

            {/* Précisions */}
            <div style={glassCard} className="space-y-2">
              <div className="flex items-center justify-between">
                <p style={sectionLabel}>PRÉCISIONS</p>
                <MicButton field="precisions" />
              </div>
              <textarea
                value={draftPrecisions}
                onChange={(e) => setDraftPrecisions(e.target.value)}
                onBlur={() => {
                  const val = draftPrecisions.trim() || null;
                  if (val !== (item.precisions ?? null)) autoSave({ precisions: val });
                }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={2}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                style={glassFieldStyle}
                placeholder="Ajouter des précisions…"
              />
            </div>

            {/* Professionnel */}
            <div style={glassCard} className="space-y-2">
              <p style={sectionLabel}>PROFESSIONNEL</p>
              <IntervenantSearchPicker
                enfantId={enfantId}
                value={item.linked_pro_ids[0] || null}
                onChange={handleIntervenantChange}
              />
            </div>

            {/* Réponse reçue */}
            <div style={glassCard} className="space-y-2">
              <div className="flex items-center justify-between">
                <p style={sectionLabel}>RÉPONSE REÇUE</p>
                <MicButton field="answer" />
              </div>
              <textarea
                value={draftAnswer}
                onChange={(e) => setDraftAnswer(e.target.value)}
                onBlur={() => {
                  const val = draftAnswer.trim() || null;
                  if (val !== (item.answer ?? null)) autoSave({ answer: val });
                }}
                onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }}
                ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; } }}
                rows={2}
                className="w-full resize-none overflow-hidden rounded-lg px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
                style={{
                  ...glassFieldStyle,
                  borderLeft: "2px solid #AFA9EC",
                  background: "rgba(139,116,224,0.06)",
                }}
                placeholder="Ajouter la réponse reçue…"
              />
            </div>
          </>
        )}

        {/* ── Bottom action ── */}
        {!isArchived ? (
          <button
            type="button"
            onClick={handleArchive}
            className="w-full text-center"
            style={{
              background: "rgba(68,168,130,0.1)",
              border: "1px solid rgba(68,168,130,0.25)",
              color: "#0F6E56",
              borderRadius: 12,
              padding: 12,
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Clôturer ✓
          </button>
        ) : (
          <button
            type="button"
            onClick={handleReopen}
            className="w-full text-center"
            style={{
              background: "rgba(139,116,224,0.1)",
              border: "1px solid rgba(139,116,224,0.25)",
              color: "#534AB7",
              borderRadius: 12,
              padding: 12,
              fontWeight: 500,
              fontSize: 14,
            }}
          >
            Réouvrir
          </button>
        )}
      </main>

      <BottomNavBar />

      {/* Delete modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              style={{ background: "#E8736A" }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
