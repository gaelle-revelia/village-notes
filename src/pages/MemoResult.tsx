import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Pencil, X, Plus, Trash2, ChevronDown, Activity, Hand, Brain, Stethoscope, MessageCircle, User, Heart, Waves } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";

interface StructuredContent {
  resume?: string;
  details?: string[];
  suggestions?: string[];
  tags?: string[];
  intervenant_detected?: string | null;
  points_cles?: string[];
}

interface MemoData {
  id: string;
  memo_date: string;
  type: string;
  content_structured: StructuredContent | null;
  transcription_raw: string | null;
  intervenant_id: string | null;
  enfant_id: string | null;
  file_url: string | null;
  intervenants?: { nom: string; specialite: string | null } | null;
}

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

// --- Domain color system (Knowledge File) ---
const DOMAIN_COLORS: Record<string, string> = {
  moteur: "#E8736A",
  motricité: "#E8736A",
  kinésithérapie: "#E8736A",
  physique: "#E8736A",
  cognitif: "#8B74E0",
  psychomotricité: "#8B74E0",
  psychomoteur: "#8B74E0",
  sensoriel: "#44A882",
  communication: "#44A882",
  langage: "#44A882",
  orthophonie: "#44A882",
  "bien-être": "#E8A44A",
  émotionnel: "#E8A44A",
  sommeil: "#E8A44A",
  alimentation: "#E8A44A",
  comportement: "#E8A44A",
  médical: "#8A9BAE",
  administratif: "#8A9BAE",
  progrès: "#44A882",
  difficulté: "#E8A44A",
  autonomie: "#8B74E0",
  social: "#8B74E0",
};

function getDomainColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#8A9BAE";
}

function getDomainsFromTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const colors: string[] = [];
  for (const tag of tags) {
    const c = getDomainColor(tag);
    if (!seen.has(c)) { seen.add(c); colors.push(c); }
    if (colors.length >= 3) break;
  }
  return colors;
}

// --- Intervenant avatar system ---
const SPECIALITE_AVATARS: Record<string, { icon: typeof Activity; gradient: string }> = {
  kiné: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  kinésithérapeute: { icon: Activity, gradient: "linear-gradient(135deg, #E8736A, #E8845A)" },
  psychomotric: { icon: Brain, gradient: "linear-gradient(135deg, #8B74E0, #5CA8D8)" },
  ergothérapeute: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  ergo: { icon: Hand, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  parent: { icon: Heart, gradient: "linear-gradient(135deg, #E8736A, #C85A8A)" },
  médecin: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  mpr: { icon: Stethoscope, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" },
  orthophoniste: { icon: MessageCircle, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
  piscine: { icon: Waves, gradient: "linear-gradient(135deg, #44A882, #4E96C8)" },
};

function getSpecialiteAvatar(specialite: string | null): { icon: typeof Activity; gradient: string } {
  const s = (specialite || "").toLowerCase();
  for (const [key, val] of Object.entries(SPECIALITE_AVATARS)) {
    if (s.includes(key)) return val;
  }
  return { icon: User, gradient: "linear-gradient(135deg, #8A9BAE, #6B7F94)" };
}

// --- Liquid glass card style ---
const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: 16,
  padding: 20,
  boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
};

const editInputStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 15,
  lineHeight: 1.6,
  border: "1px solid hsl(4 68% 66%)",
  borderRadius: 8,
  padding: "10px 12px",
  outline: "none",
  backgroundColor: "rgba(255,255,255,0.7)",
  resize: "none",
};

const MemoResult = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  const [editing, setEditing] = useState(false);
  const [editDate, setEditDate] = useState<Date>(new Date());
  const [editIntervenantId, setEditIntervenantId] = useState<string | null>(null);
  const [editTranscription, setEditTranscription] = useState("");
  const [editResume, setEditResume] = useState("");
  const [editDetails, setEditDetails] = useState("");
  const [editSuggestions, setEditSuggestions] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [originalNoteOpen, setOriginalNoteOpen] = useState(false);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from("memos")
      .select("id, memo_date, type, content_structured, transcription_raw, intervenant_id, enfant_id, file_url, intervenants(nom, specialite)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setMemo(data as any);
        setLoading(false);
      });
  }, [id, user]);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .order("nom")
      .then(({ data }) => setIntervenants(data || []));
  }, [enfantId]);

  const enterEditMode = () => {
    if (!memo) return;
    const structured = memo.content_structured;
    setEditDate(new Date(memo.memo_date));
    setEditIntervenantId(memo.intervenant_id);
    setEditTranscription(memo.transcription_raw || "");
    setEditResume(structured?.resume || "");
    const details = structured?.details || structured?.points_cles || [];
    setEditDetails(details.join("\n"));
    setEditSuggestions((structured?.suggestions || []).join("\n"));
    setEditTags([...(structured?.tags || [])]);
    setNewTag("");
    setEditing(true);
  };

  const cancelEdit = () => setEditing(false);

  const handleSave = async () => {
    if (!memo) return;
    setSaving(true);

    const updatedFields: any = {
      memo_date: editDate.toISOString().split("T")[0],
      intervenant_id: editIntervenantId,
      transcription_raw: editTranscription || null,
    };

    if (memo.type === "vocal" || memo.type === "note") {
      updatedFields.content_structured = {
        ...(memo.content_structured || {}),
        resume: editResume || undefined,
        details: editDetails.split("\n").filter(l => l.trim()),
        suggestions: editSuggestions.split("\n").filter(l => l.trim()),
        tags: editTags,
      };
    } else if (memo.type === "evenement") {
      updatedFields.content_structured = editResume ? { resume: editResume } : null;
    }

    const { error } = await supabase
      .from("memos")
      .update(updatedFields)
      .eq("id", memo.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
      setSaving(false);
      return;
    }

    const { data: refreshed } = await supabase
      .from("memos")
      .select("id, memo_date, type, content_structured, transcription_raw, intervenant_id, enfant_id, file_url, intervenants(nom, specialite)")
      .eq("id", memo.id)
      .single();

    if (refreshed) setMemo(refreshed as any);
    setEditing(false);
    setSaving(false);
    toast({ title: "Modifications enregistrées", duration: 2000 });
  };

  const handleDelete = async () => {
    if (!memo) return;
    setDeleting(true);
    const { error } = await supabase.from("memos").delete().eq("id", memo.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
      setDeleting(false);
      return;
    }
    toast({ title: "Mémo supprimé", duration: 2000 });
    navigate("/timeline");
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !editTags.includes(t)) setEditTags([...editTags, t]);
    setNewTag("");
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!memo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Mémo introuvable.</p>
      </div>
    );
  }

  const structured = memo.content_structured;
  const details = structured?.details || structured?.points_cles || [];
  const suggestions = structured?.suggestions || [];
  const tags = structured?.tags || [];
  const domainColors = getDomainsFromTags(tags);
  const intervenantData = memo.intervenants as any;
  const intervenantName = intervenantData?.nom || null;
  const intervenantSpec = intervenantData?.specialite || null;
  const formattedDate = format(new Date(memo.memo_date), "dd MMMM yyyy", { locale: fr });

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        {editing ? (
          <>
            <button
              onClick={cancelEdit}
              className="text-sm text-muted-foreground bg-transparent border-none"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-semibold text-white border-none rounded-lg px-5 py-2"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? "..." : "Enregistrer"}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => navigate("/timeline")}
              className="flex items-center gap-1 text-sm text-muted-foreground bg-transparent border-none"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="bg-transparent border-none"
                aria-label="Supprimer"
              >
                <Trash2 size={20} className="text-destructive" />
              </button>
              <button
                onClick={enterEditMode}
                className="bg-transparent border-none"
                aria-label="Modifier"
              >
                <Pencil size={20} className="text-primary" />
              </button>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 px-4 pb-8">
        <div className="mx-auto max-w-[400px] space-y-5">
          {/* Title & domain dots */}
          <div className="text-center space-y-2">
            <h2 className="text-2xl text-foreground">
              {editing ? "Modifier le mémo" : "Mémo enregistré"}
            </h2>
            {/* Domain dots */}
            {!editing && domainColors.length > 0 && (
              <div className="flex items-center justify-center gap-1.5">
                {domainColors.map((color, i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: color }} />
                ))}
              </div>
            )}
          </div>

          {/* Date */}
          {editing ? (
            <div style={glassCard}>
              <MemoDatePicker date={editDate} onDateChange={setEditDate} />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              {formattedDate}
            </p>
          )}

          {/* Intervenant */}
          {editing ? (
            <div style={glassCard}>
              <label className="text-sm font-medium text-foreground block mb-2">
                Avec quel intervenant ?
              </label>
              {intervenants.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun intervenant enregistré</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {intervenants.map((i) => {
                    const selected = editIntervenantId === i.id;
                    const { gradient } = getSpecialiteAvatar(i.specialite);
                    return (
                      <button
                        key={i.id}
                        onClick={() => setEditIntervenantId(selected ? null : i.id)}
                        className="text-sm font-medium rounded-lg px-3.5 py-2 transition-all"
                        style={{
                          border: selected ? "none" : "1px solid rgba(255,255,255,0.72)",
                          background: selected ? gradient : "rgba(255,255,255,0.5)",
                          color: selected ? "#FFFFFF" : "hsl(12 8% 11%)",
                        }}
                      >
                        {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : intervenantName ? (
            <div className="flex items-center justify-center gap-2">
              {(() => {
                const { icon: Icon, gradient } = getSpecialiteAvatar(intervenantSpec);
                return (
                  <div
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 22, height: 22, borderRadius: "50%", background: gradient, overflow: "hidden" }}
                  >
                    <Icon size={12} color="#FFFFFF" />
                  </div>
                );
              })()}
              <p className="text-sm text-foreground">
                {intervenantName}{intervenantSpec ? ` · ${intervenantSpec}` : ""}
              </p>
            </div>
          ) : null}

          {/* Transcription — vocal, evenement */}
          {(memo.type === "vocal" || memo.type === "evenement") && (
            editing ? (
              <div style={glassCard}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  {memo.type === "evenement" ? "Titre" : "Transcription"}
                </label>
                {memo.type === "evenement" ? (
                  <input
                    value={editTranscription}
                    onChange={(e) => setEditTranscription(e.target.value)}
                    className="text-foreground"
                    style={{ ...editInputStyle, resize: undefined }}
                  />
                ) : (
                  <textarea
                    value={editTranscription}
                    onChange={(e) => setEditTranscription(e.target.value)}
                    rows={5}
                    className="text-foreground"
                    style={editInputStyle}
                  />
                )}
              </div>
            ) : null
          )}

          {/* Note type: transcription in edit mode */}
          {memo.type === "note" && editing && (
            <div style={glassCard}>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                Votre note
              </label>
              <textarea
                value={editTranscription}
                onChange={(e) => setEditTranscription(e.target.value)}
                rows={5}
                className="text-foreground"
                style={editInputStyle}
              />
            </div>
          )}

          {/* Resume */}
          {(memo.type === "vocal" || memo.type === "note" || memo.type === "evenement") && (
            editing ? (
              <div style={glassCard}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  {memo.type === "evenement" ? "Description" : "Résumé"}
                </label>
                <textarea
                  value={editResume}
                  onChange={(e) => setEditResume(e.target.value)}
                  rows={3}
                  className="text-foreground"
                  style={editInputStyle}
                />
              </div>
            ) : structured?.resume ? (
              <div style={glassCard}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Résumé
                </h3>
                <p className="text-[15px] text-foreground leading-relaxed">
                  {structured.resume}
                </p>
              </div>
            ) : null
          )}

          {/* Details */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={glassCard}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Détails (un par ligne)
                </label>
                <textarea
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  rows={4}
                  className="text-foreground"
                  style={editInputStyle}
                />
              </div>
            ) : details.length > 0 ? (
              <div style={glassCard}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  Détails
                </h3>
                <ul className="space-y-2">
                  {details.map((d, i) => (
                    <li key={i} className="flex gap-2 text-[15px] text-foreground">
                      <span className="text-primary mt-0.5">•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}

          {/* Suggestions */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={glassCard}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  À retenir (un par ligne)
                </label>
                <textarea
                  value={editSuggestions}
                  onChange={(e) => setEditSuggestions(e.target.value)}
                  rows={3}
                  className="text-foreground"
                  style={editInputStyle}
                />
              </div>
            ) : suggestions.length > 0 ? (
              <div style={glassCard}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                  À retenir
                </h3>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2 text-[15px] text-foreground">
                      <span className="mt-0.5">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}

          {/* Tags — edit mode: domain-colored dots + text; view mode: domain dots only */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={glassCard}>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editTags.map((tag, i) => {
                    const color = getDomainColor(tag);
                    return (
                      <span
                        key={i}
                        className="flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: `${color}15`,
                          color,
                        }}
                      >
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
                        {tag}
                        <button
                          onClick={() => setEditTags(editTags.filter((_, j) => j !== i))}
                          className="bg-transparent border-none p-0 ml-0.5"
                          style={{ color }}
                        >
                          <X size={12} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Nouveau tag..."
                    className="flex-1 text-sm text-foreground placeholder:text-muted-foreground"
                    style={{
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 8,
                      padding: "6px 10px",
                      outline: "none",
                      background: "rgba(255,255,255,0.5)",
                    }}
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="flex items-center gap-1 text-sm font-medium bg-transparent border-none"
                    style={{ color: newTag.trim() ? "#E8736A" : "#8A9BAE" }}
                  >
                    <Plus size={14} />
                    Ajouter
                  </button>
                </div>
              </div>
            ) : null
            /* View mode tags removed — domain dots shown at top */
          )}

          {/* Collapsible "Note originale" */}
          {memo.type === "note" && !editing && memo.transcription_raw && (
            <div>
              <button
                onClick={() => setOriginalNoteOpen(!originalNoteOpen)}
                className="flex items-center gap-1 text-sm text-muted-foreground bg-transparent border-none cursor-pointer p-0"
              >
                <ChevronDown
                  size={16}
                  style={{
                    transition: "transform 0.2s ease",
                    transform: originalNoteOpen ? "rotate(180deg)" : "rotate(0deg)",
                  }}
                />
                Note originale
              </button>
              {originalNoteOpen && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground italic leading-relaxed whitespace-pre-wrap">
                    {memo.transcription_raw}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Delete link in edit mode */}
          {editing && (
            <div className="text-center pt-4">
              <button
                onClick={() => setDeleteModalOpen(true)}
                className="text-sm font-medium text-destructive bg-transparent border-none cursor-pointer"
              >
                Supprimer ce mémo
              </button>
            </div>
          )}

          {/* Return button */}
          {!editing && (
            <button
              onClick={() => navigate("/timeline")}
              className="w-full h-12 rounded-xl border-none text-base font-semibold text-white cursor-pointer mt-2"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                boxShadow: "0 6px 20px rgba(139,116,224,0.3)",
              }}
            >
              Retour à la timeline
            </button>
          )}
        </div>
      </main>

      {/* Delete confirmation modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDeleteModalOpen(false)}
          />
          <div
            className="relative z-10 w-[85%] max-w-[340px] text-center"
            style={{ ...glassCard, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl text-foreground mb-2">
              Supprimer ce mémo ?
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              Cette action est irréversible.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full h-12 rounded-xl border-none text-base font-semibold text-white cursor-pointer"
                style={{
                  backgroundColor: "hsl(4 68% 50%)",
                  opacity: deleting ? 0.7 : 1,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="w-full h-12 rounded-xl text-base font-medium text-foreground cursor-pointer"
                style={{
                  border: "1px solid rgba(255,255,255,0.72)",
                  background: "rgba(255,255,255,0.5)",
                }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemoResult;
