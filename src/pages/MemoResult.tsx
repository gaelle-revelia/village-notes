import { useEffect, useState, useMemo } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Pencil, X, Plus, Trash2, ChevronDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { Button } from "@/components/ui/button";
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

const TAG_DOMAIN_COLORS: Record<string, string> = {
  moteur: "#5A7A9A",
  motricité: "#5A7A9A",
  kinésithérapie: "#5A7A9A",
  psychomotricité: "#8B7DAA",
  sensoriel: "#6A8875",
  cognitif: "#A8884D",
  social: "#8B7DAA",
  administratif: "#8B8B8B",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(TAG_DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#8B8B8B";
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const MemoResult = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  // Edit mode state
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

  // Fetch intervenants
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

  const cancelEdit = () => {
    setEditing(false);
  };

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
    // For 'document', content_structured stays as-is

    const { error } = await supabase
      .from("memos")
      .update(updatedFields)
      .eq("id", memo.id);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
      setSaving(false);
      return;
    }

    // Refresh memo
    const { data: refreshed } = await supabase
      .from("memos")
      .select("id, memo_date, type, content_structured, transcription_raw, intervenant_id, enfant_id, file_url, intervenants(nom, specialite)")
      .eq("id", memo.id)
      .single();

    if (refreshed) setMemo(refreshed as any);
    setEditing(false);
    setSaving(false);
    toast({
      title: "Modifications enregistrées",
      duration: 2000,
      style: { backgroundColor: "#7C9885", color: "#FFFFFF", border: "none" },
    });
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
    toast({
      title: "Mémo supprimé",
      duration: 2000,
      style: { backgroundColor: "#C4626B", color: "#FFFFFF", border: "none" },
    });
    navigate("/timeline");
  };

  const addTag = () => {
    const t = newTag.trim();
    if (t && !editTags.includes(t)) {
      setEditTags([...editTags, t]);
    }
    setNewTag("");
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
        <div className="animate-pulse" style={{ color: "#8B7D8B" }}>Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!memo) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "#F4F1EA" }}>
        <p style={{ color: "#8B7D8B" }}>Mémo introuvable.</p>
      </div>
    );
  }

  const structured = memo.content_structured;
  const details = structured?.details || structured?.points_cles || [];
  const suggestions = structured?.suggestions || [];
  const tags = structured?.tags || [];
  const intervenantData = memo.intervenants as any;
  const intervenantName = intervenantData?.nom || null;
  const intervenantSpec = intervenantData?.specialite || null;
  const formattedDate = format(new Date(memo.memo_date), "dd MMMM yyyy", { locale: fr });

  const cardStyle = {
    backgroundColor: "#FFFFFF",
    border: "1px solid #E8E3DB",
    borderRadius: 12,
    padding: 20,
  };

  const editInputStyle = {
    width: "100%",
    fontFamily: "Inter, sans-serif",
    fontSize: 15,
    color: "#2A2A2A",
    lineHeight: 1.6 as number,
    border: "1px solid #6B8CAE",
    borderRadius: 8,
    padding: "10px 12px",
    outline: "none",
    backgroundColor: "#FFFFFF",
    resize: "none" as const,
  };

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: "#F4F1EA" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{ backgroundColor: "#F4F1EA" }}
      >
        {editing ? (
          <>
            <button
              onClick={cancelEdit}
              style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B", background: "none", border: "none" }}
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                fontFamily: "Inter, sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: "#6B8CAE",
                border: "none",
                borderRadius: 8,
                padding: "8px 20px",
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
              className="flex items-center gap-1"
              style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B", background: "none", border: "none" }}
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </button>
            <div className="flex items-center" style={{ gap: 16 }}>
              <button
                onClick={() => setDeleteModalOpen(true)}
                style={{ background: "none", border: "none" }}
                aria-label="Supprimer"
              >
                <Trash2 size={20} color="#C4626B" />
              </button>
              <button
                onClick={enterEditMode}
                style={{ background: "none", border: "none" }}
                aria-label="Modifier"
              >
                <Pencil size={20} color="#6B8CAE" />
              </button>
            </div>
          </>
        )}
      </header>

      <main className="flex-1 px-4 pb-8">
        <div className="mx-auto max-w-[400px] space-y-5">
          {/* Title & date */}
          <div className="text-center space-y-1">
            <h2 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 24, fontWeight: 600, color: "#2A2A2A" }}>
              {editing ? "Modifier le mémo" : "Mémo enregistré"}
            </h2>
          </div>

          {/* Date */}
          {editing ? (
            <div style={cardStyle}>
              <MemoDatePicker date={editDate} onDateChange={setEditDate} />
            </div>
          ) : (
            <p className="text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B" }}>
              {formattedDate}
            </p>
          )}

          {/* Intervenant */}
          {editing ? (
            <div style={cardStyle}>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 14, fontWeight: 500, color: "#2A2A2A", display: "block", marginBottom: 8 }}>
                Avec quel intervenant ?
              </label>
              {intervenants.length === 0 ? (
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#8B7D8B" }}>
                  Aucun intervenant enregistré
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {intervenants.map((i) => {
                    const selected = editIntervenantId === i.id;
                    return (
                      <button
                        key={i.id}
                        onClick={() => setEditIntervenantId(selected ? null : i.id)}
                        style={{
                          fontFamily: "Inter, sans-serif",
                          fontSize: 13,
                          fontWeight: 500,
                          borderRadius: 8,
                          padding: "8px 14px",
                          border: `1px solid ${selected ? "#6B8CAE" : "#E8E3DB"}`,
                          backgroundColor: selected ? "#6B8CAE" : "#FFFFFF",
                          color: selected ? "#FFFFFF" : "#2A2A2A",
                          transition: "all 0.15s ease",
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
            <p className="text-center" style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#6B5B73" }}>
              {intervenantName}{intervenantSpec ? ` · ${intervenantSpec}` : ""}
            </p>
          ) : null}

          {/* Transcription — for vocal, evenement (editable); for note: shown as collapsible in view mode */}
          {(memo.type === "vocal" || memo.type === "evenement") && (
            editing ? (
              <div style={cardStyle}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                  {memo.type === "evenement" ? "Titre" : "Transcription"}
                </label>
                {memo.type === "evenement" ? (
                  <input
                    value={editTranscription}
                    onChange={(e) => setEditTranscription(e.target.value)}
                    style={{ ...editInputStyle, resize: undefined }}
                  />
                ) : (
                  <textarea
                    value={editTranscription}
                    onChange={(e) => setEditTranscription(e.target.value)}
                    rows={5}
                    style={editInputStyle}
                  />
                )}
              </div>
            ) : null
          )}

          {/* Note type: transcription editable in edit mode */}
          {memo.type === "note" && editing && (
            <div style={cardStyle}>
              <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                Votre note
              </label>
              <textarea
                value={editTranscription}
                onChange={(e) => setEditTranscription(e.target.value)}
                rows={5}
                style={editInputStyle}
              />
            </div>
          )}

          {/* Resume — vocal, note & evenement */}
          {(memo.type === "vocal" || memo.type === "note" || memo.type === "evenement") && (
            editing ? (
              <div style={cardStyle}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                  {memo.type === "evenement" ? "Description" : "Résumé"}
                </label>
                <textarea
                  value={editResume}
                  onChange={(e) => setEditResume(e.target.value)}
                  rows={3}
                  style={editInputStyle}
                />
              </div>
            ) : structured?.resume ? (
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                  Résumé
                </h3>
                <p style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#2A2A2A", lineHeight: 1.6 }}>
                  {structured.resume}
                </p>
              </div>
            ) : null
          )}

          {/* Details — vocal & note */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={cardStyle}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                  Détails (un par ligne)
                </label>
                <textarea
                  value={editDetails}
                  onChange={(e) => setEditDetails(e.target.value)}
                  rows={4}
                  style={editInputStyle}
                />
              </div>
            ) : details.length > 0 ? (
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                  Détails
                </h3>
                <ul className="space-y-2">
                  {details.map((d, i) => (
                    <li key={i} className="flex gap-2" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#2A2A2A" }}>
                      <span style={{ color: "#6B8CAE", marginTop: 2 }}>•</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}

          {/* Suggestions — vocal & note */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={cardStyle}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                  À retenir (un par ligne)
                </label>
                <textarea
                  value={editSuggestions}
                  onChange={(e) => setEditSuggestions(e.target.value)}
                  rows={3}
                  style={editInputStyle}
                />
              </div>
            ) : suggestions.length > 0 ? (
              <div style={cardStyle}>
                <h3 style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, marginBottom: 8 }}>
                  À retenir
                </h3>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex gap-2" style={{ fontFamily: "Inter, sans-serif", fontSize: 15, color: "#2A2A2A" }}>
                      <span style={{ marginTop: 2 }}>→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}

          {/* Tags — vocal & note */}
          {(memo.type === "vocal" || memo.type === "note") && (
            editing ? (
              <div style={cardStyle}>
                <label style={{ fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: "#A8A0A8", letterSpacing: "0.08em", textTransform: "uppercase" as const, display: "block", marginBottom: 8 }}>
                  Tags
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {editTags.map((tag, i) => {
                    const color = getTagColor(tag);
                    return (
                      <span
                        key={i}
                        className="flex items-center gap-1"
                        style={{
                          borderRadius: 6,
                          borderLeft: `3px solid ${color}`,
                          backgroundColor: hexToRgba(color, 0.08),
                          padding: "4px 10px",
                          fontFamily: "Inter, sans-serif",
                          fontSize: 11,
                          fontWeight: 500,
                          color,
                        }}
                      >
                        {tag}
                        <button
                          onClick={() => setEditTags(editTags.filter((_, j) => j !== i))}
                          style={{ background: "none", border: "none", color, padding: 0, marginLeft: 2 }}
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
                    style={{
                      flex: 1,
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      color: "#2A2A2A",
                      border: "1px solid #E8E3DB",
                      borderRadius: 8,
                      padding: "6px 10px",
                      outline: "none",
                    }}
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTag.trim()}
                    className="flex items-center gap-1"
                    style={{
                      fontFamily: "Inter, sans-serif",
                      fontSize: 13,
                      fontWeight: 500,
                      color: newTag.trim() ? "#6B8CAE" : "#C4BDB8",
                      background: "none",
                      border: "none",
                    }}
                  >
                    <Plus size={14} />
                    Ajouter
                  </button>
                </div>
              </div>
            ) : tags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => {
                  const color = getTagColor(tag);
                  return (
                    <span
                      key={i}
                      style={{
                        borderRadius: 6,
                        borderLeft: `3px solid ${color}`,
                        backgroundColor: hexToRgba(color, 0.08),
                        padding: "4px 10px",
                        fontFamily: "Inter, sans-serif",
                        fontSize: 11,
                        fontWeight: 500,
                        color,
                      }}
                    >
                      {tag}
                    </span>
                  );
                })}
              </div>
            ) : null
          )}

          {/* Collapsible "Note originale" — for note type in view mode */}
          {memo.type === "note" && !editing && memo.transcription_raw && (
            <div>
              <button
                onClick={() => setOriginalNoteOpen(!originalNoteOpen)}
                className="flex items-center gap-1"
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 13,
                  color: "#8B7D8B",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                }}
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
                <div style={{ marginTop: 8 }}>
                  <p style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: 14,
                    color: "#6B5B73",
                    fontStyle: "italic",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap" as const,
                  }}>
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
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 14,
                  fontWeight: 500,
                  color: "#C4626B",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Supprimer ce mémo
              </button>
            </div>
          )}

          {/* Return button — view mode only */}
          {!editing && (
            <button
              onClick={() => navigate("/timeline")}
              style={{
                width: "100%",
                height: 48,
                borderRadius: 12,
                border: "none",
                fontFamily: "Inter, sans-serif",
                fontSize: 16,
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: "#6B8CAE",
                cursor: "pointer",
                marginTop: 8,
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
            className="absolute inset-0"
            style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
            onClick={() => setDeleteModalOpen(false)}
          />
          <div
            className="relative z-10 w-[85%] max-w-[340px] text-center"
            style={{ backgroundColor: "#FFFFFF", borderRadius: 16, padding: 24 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Crimson Text', Georgia, serif", fontSize: 20, fontWeight: 600, color: "#2A2A2A", marginBottom: 8 }}>
              Supprimer ce mémo ?
            </h3>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: 14, color: "#8B7D8B", marginBottom: 24 }}>
              Cette action est irréversible.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "none",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  backgroundColor: "#C4626B",
                  opacity: deleting ? 0.7 : 1,
                  cursor: deleting ? "not-allowed" : "pointer",
                }}
              >
                {deleting ? "Suppression..." : "Supprimer"}
              </button>
              <button
                onClick={() => setDeleteModalOpen(false)}
                style={{
                  width: "100%",
                  height: 48,
                  borderRadius: 12,
                  border: "1px solid #E8E3DB",
                  fontFamily: "Inter, sans-serif",
                  fontSize: 16,
                  fontWeight: 500,
                  color: "#2A2A2A",
                  backgroundColor: "#FFFFFF",
                  cursor: "pointer",
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
