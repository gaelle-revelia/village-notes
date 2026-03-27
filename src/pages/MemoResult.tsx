import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Trash2, X, Plus, Info, FileText, Download, ExternalLink, Check, Loader2 } from "lucide-react";
import { getSpecialiteAvatar } from "@/lib/avatar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent } from
"@/components/ui/dialog";

// --- Types ---
interface StructuredContent {
  resume?: string;
  details?: string[];
  suggestions?: string[];
  a_retenir?: string[];
  tags?: string[];
  intervenant_detected?: string | null;
  points_cles?: string[];
  mode?: string;
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
  intervenants?: {nom: string;specialite: string | null;} | null;
}

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

// --- Domain system ---
const DOMAINS = [
{ key: "moteur", label: "Moteur", color: "#E8736A", keywords: ["moteur", "motricite", "motricité", "kine", "kiné", "physique", "kinésithérapie"] },
{ key: "cognitif", label: "Cognitif", color: "#8B74E0", keywords: ["cognitif", "psychomoteur", "psychomotricite", "psychomotricité"] },
{ key: "sensoriel", label: "Sensoriel", color: "#44A882", keywords: ["sensoriel", "communication", "langage", "orthophonie"] },
{ key: "bien-etre", label: "Bien-être", color: "#E8A44A", keywords: ["bien-etre", "bien-être", "emotionnel", "émotionnel", "sommeil", "alimentation"] },
{ key: "medical", label: "Médical", color: "#8A9BAE", keywords: ["medical", "médical", "administratif"] }];


const DOMAIN_INFO = [
{ label: "Moteur & physique", color: "#E8736A", desc: "Tout ce qui touche au corps : tonus, posture, motricité, déplacements" },
{ label: "Cognitif & psychomoteur", color: "#8B74E0", desc: "Compréhension, attention, mémoire, coordination gestes-pensée" },
{ label: "Sensoriel & communication", color: "#44A882", desc: "Réactions aux sons, au toucher, au regard, langage et expression" },
{ label: "Bien-être & émotionnel", color: "#E8A44A", desc: "Humeur, fatigue, sommeil, appétit, confort au quotidien" },
{ label: "Médical & administratif", color: "#8A9BAE", desc: "Rendez-vous médicaux, bilans, MDPH, matériel" }];


function isDomainActive(domainKey: string, tags: string[]): boolean {
  const domain = DOMAINS.find((d) => d.key === domainKey);
  if (!domain) return false;
  return tags.some((t) => domain.keywords.some((kw) => t.toLowerCase().includes(kw)));
}

function getDomainColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const d of DOMAINS) {
    if (d.keywords.some((kw) => lower.includes(kw))) return d.color;
  }
  return "#8A9BAE";
}

// --- Intervenant avatar system ---
// getSpecialiteAvatar imported from @/lib/avatar

// --- Styles ---
const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: 16,
  padding: "16px 20px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)"
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#9A9490",
  marginBottom: 8
};

const MemoResult = () => {
  const { id } = useParams<{id: string;}>();
  const { user, loading: authLoading } = useAuth();
  const { enfantId, role } = useEnfantId();
  const navigate = useNavigate();

  const [memo, setMemo] = useState<MemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  // Swipe navigation between memos
  const [memoIds, setMemoIds] = useState<string[]>([]);
  const [swipeFade, setSwipeFade] = useState(false);
  const swipeStart = useRef<{x: number;y: number;} | null>(null);

  // Per-field editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [intervenantSearch, setIntervenantSearch] = useState("");
  const [showDomaineInfo, setShowDomaineInfo] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [signedFileUrl, setSignedFileUrl] = useState<string | null>(null);
  const [activitySaving, setActivitySaving] = useState<string | null>(null);
  const [activitySaved, setActivitySaved] = useState<string | null>(null);
  // text_quick collapsible sections
  const [showDomaines, setShowDomaines] = useState(false);
  const [showARetenir, setShowARetenir] = useState(false);
  const [showTags, setShowTags] = useState(false);
  // Temp edit values
  const [tempResume, setTempResume] = useState("");
  const [tempDetails, setTempDetails] = useState("");
  const [tempSuggestions, setTempSuggestions] = useState("");

  // Refs for auto-focus
  const resumeRef = useRef<HTMLTextAreaElement>(null);
  const detailsRef = useRef<HTMLTextAreaElement>(null);
  const suggestionsRef = useRef<HTMLTextAreaElement>(null);

  // --- Data fetching ---
  const fetchMemo = useCallback(async () => {
    if (!id || !user) return;
    const { data } = await supabase.
    from("memos").
    select("id, memo_date, type, content_structured, transcription_raw, intervenant_id, enfant_id, file_url, intervenants(nom, specialite)").
    eq("id", id).
    single();
    if (data) setMemo(data as any);
    setLoading(false);
  }, [id, user]);

  useEffect(() => {fetchMemo();}, [fetchMemo]);

  // Generate signed URL for document files
  useEffect(() => {
    if (!memo || memo.type !== "document" || !memo.file_url) {
      setSignedFileUrl(null);
      return;
    }
    // Extract storage path from public URL: everything after /voice-memos/
    const match = memo.file_url.match(/\/voice-memos\/(.+)$/);
    if (!match) return;
    const storagePath = match[1];
    supabase.storage.
    from("voice-memos").
    createSignedUrl(storagePath, 3600) // 1h
    .then(({ data }) => {
      if (data?.signedUrl) setSignedFileUrl(data.signedUrl);
    });
  }, [memo?.id, memo?.type, memo?.file_url]);

  // Fade in when memo changes
  useEffect(() => {
    setSwipeFade(false);
  }, [id]);

  useEffect(() => {
    if (!enfantId) return;
    supabase.
    from("intervenants").
    select("id, nom, specialite").
    eq("enfant_id", enfantId).
    eq("actif", true).
    order("nom").
    then(({ data }) => setIntervenants(data || []));
  }, [enfantId]);

  // Fetch ordered memo IDs for swipe navigation
  useEffect(() => {
    if (!user) return;
    supabase.
    from("memos").
    select("id").

    order("memo_date", { ascending: true }).
    order("created_at", { ascending: true }).
    then(({ data }) => {
      if (data) setMemoIds(data.map((m) => m.id));
    });
  }, [user]);

  // Swipe touch handler for memo navigation
  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      swipeStart.current = { x: t.clientX, y: t.clientY };
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (!swipeStart.current || !id || memoIds.length === 0) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - swipeStart.current.x;
      const dy = Math.abs(t.clientY - swipeStart.current.y);
      swipeStart.current = null;
      if (Math.abs(dx) < 50 || dy > 100) return;
      const idx = memoIds.indexOf(id);
      if (idx === -1) return;
      const nextIdx = dx < 0 ? idx + 1 : idx - 1;
      if (nextIdx >= 0 && nextIdx < memoIds.length) {
        setSwipeFade(true);
        setTimeout(() => navigate(`/memo-result/${memoIds[nextIdx]}`), 200);
      }
    };
    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [id, memoIds, navigate]);

  // --- Auto-save ---
  const autoSave = async (updates: Record<string, any>) => {
    if (!memo) return;
    const { error } = await supabase.from("memos").update(updates).eq("id", memo.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
      return;
    }
    await fetchMemo();
    toast({ title: "Sauvegardé ✓", duration: 2000 });
  };

  // --- Delete ---
  const handleDelete = async () => {
    if (!memo) return;
    setDeleting(true);

    try {
      if (memo.type === "activite" && memo.enfant_id) {
        // Cascade: delete matching session_activite + memo in parallel
        const memoDate = memo.memo_date; // format YYYY-MM-DD
        const [sessionRes, memoRes] = await Promise.all([
        supabase.
        from("sessions_activite").
        delete().
        eq("enfant_id", memo.enfant_id).
        gte("created_at", `${memoDate}T00:00:00`).
        lt("created_at", `${memoDate}T23:59:59.999`),
        supabase.from("memos").delete().eq("id", memo.id)]
        );
        if (sessionRes.error) console.error("Delete session error:", sessionRes.error);
        if (memoRes.error) {
          toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
          setDeleting(false);
          return;
        }
      } else {
        const { error } = await supabase.from("memos").delete().eq("id", memo.id);
        if (error) {
          toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
          setDeleting(false);
          return;
        }
      }

      toast({ title: "Mémo supprimé", duration: 2000 });
      navigate("/timeline");
    } catch {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
      setDeleting(false);
    }
  };

  // --- Field handlers ---
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      autoSave({ memo_date: val });
      setEditingField(null);
    }
  };

  const handleIntervenantSelect = (intId: string | null) => {
    autoSave({ intervenant_id: intId });
    setEditingField(null);
    setIntervenantSearch("");
  };

  const handleDomainToggle = (domainKey: string) => {
    if (!memo) return;
    const tags = [...(memo.content_structured?.tags || [])];
    const domain = DOMAINS.find((d) => d.key === domainKey)!;
    const active = isDomainActive(domainKey, tags);

    let newTags: string[];
    if (active) {
      // Remove all tags matching this domain
      newTags = tags.filter((t) => !domain.keywords.some((kw) => t.toLowerCase().includes(kw)));
    } else {
      // Add primary tag
      const domainLabels: Record<string, string> = {
        "moteur": "Moteur",
        "cognitif": "Cognitif",
        "sensoriel": "Sensoriel",
        "bien-etre": "Bien-être",
        "medical": "Médical"
      };
      newTags = [...tags, domainLabels[domainKey] || domainKey];
    }

    const updatedStructured = { ...(memo.content_structured || {}), tags: newTags };
    autoSave({ content_structured: updatedStructured });
  };

  const saveResume = () => {
    if (!memo) return;
    const updatedStructured = { ...(memo.content_structured || {}), resume: tempResume || undefined };
    autoSave({ content_structured: updatedStructured });
    setEditingField(null);
  };

  const saveDetails = () => {
    if (!memo) return;
    const isQuick = memo.content_structured?.mode === "text_quick";
    const items = isQuick ? [tempDetails] : tempDetails.split("\n").filter((l) => l.trim());
    const updatedStructured = { ...(memo.content_structured || {}), details: items };
    autoSave({ content_structured: updatedStructured });
    setEditingField(null);
  };

  const saveSuggestions = () => {
    if (!memo) return;
    const items = tempSuggestions.split("\n").filter((l) => l.trim());
    const { suggestions: _removed, ...rest } = (memo.content_structured || {}) as any;
    const updatedStructured = { ...rest, a_retenir: items };
    autoSave({ content_structured: updatedStructured });
    setEditingField(null);
  };

  const removeTag = (index: number) => {
    if (!memo) return;
    const tags = [...(memo.content_structured?.tags || [])];
    tags.splice(index, 1);
    const updatedStructured = { ...(memo.content_structured || {}), tags };
    autoSave({ content_structured: updatedStructured });
  };

  const addTag = () => {
    if (!memo) return;
    const t = newTag.trim();
    if (!t) return;
    const tags = [...(memo.content_structured?.tags || [])];
    if (!tags.includes(t)) {
      const updatedStructured = { ...(memo.content_structured || {}), tags: [...tags, t] };
      autoSave({ content_structured: updatedStructured });
    }
    setNewTag("");
  };

  // --- Enter edit for text fields ---
  const startEditResume = () => {
    setTempResume(memo?.content_structured?.resume || "");
    setEditingField("resume");
    setTimeout(() => resumeRef.current?.focus(), 50);
  };

  const startEditDetails = () => {
    const items = memo?.content_structured?.details || memo?.content_structured?.points_cles || [];
    setTempDetails(items.join("\n"));
    setEditingField("details");
    setTimeout(() => detailsRef.current?.focus(), 50);
  };

  const startEditSuggestions = () => {
    const items = memo?.content_structured?.a_retenir || memo?.content_structured?.suggestions || [];
    setTempSuggestions(items.join("\n"));
    setEditingField("suggestions");
    setTimeout(() => suggestionsRef.current?.focus(), 50);
  };

  // --- Rendering guards ---
  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>);

  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!memo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Mémo introuvable.</p>
      </div>);

  }

  const readOnly = role === "famille";
  const structured = memo.content_structured;
  const isTextQuick = structured?.mode === "text_quick";
  const details = structured?.details || structured?.points_cles || [];
  const suggestions = structured?.a_retenir || structured?.suggestions || [];
  const tags = structured?.tags || [];
  const intervenantData = memo.intervenants as any;
  const intervenantName = intervenantData?.nom || null;
  const intervenantSpec = intervenantData?.specialite || null;
  const formattedDate = format(new Date(memo.memo_date), "dd MMMM yyyy", { locale: fr });

  // Intervenant search filtering
  const filteredIntervenants = intervenants.filter((i) =>
  i.nom.toLowerCase().includes(intervenantSearch.toLowerCase())
  );

  const currentIdx = memoIds.indexOf(id!);
  const hasPrev = currentIdx > 0;
  const hasNext = currentIdx >= 0 && currentIdx < memoIds.length - 1;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        opacity: swipeFade ? 0 : 1,
        transition: "opacity 0.2s ease-out"
      }}>
      
      {/* Swipe arrow indicators */}
      {hasPrev &&
      <div
        className="fixed left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
        style={{ opacity: 0.3 }}>
        
          <ChevronLeft size={24} color="#9A9490" />
        </div>
      }
      {hasNext &&
      <div
        className="fixed right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
        style={{ opacity: 0.3 }}>
        
          <ChevronRight size={24} color="#9A9490" />
        </div>
      }
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
        }}>
        
        <button
          onClick={() => navigate("/timeline")}
          className="bg-transparent border-none cursor-pointer p-1"
          aria-label="Retour">
          
          <ArrowLeft size={22} color="#1E1A1A" />
        </button>
        {!readOnly &&
        <button
          onClick={() => setDeleteModalOpen(true)}
          className="bg-transparent border-none cursor-pointer p-1"
          aria-label="Supprimer">
          
            <Trash2 size={20} color="#E8736A" />
          </button>
        }
      </header>

      <main className="flex-1 px-4 pb-8" style={{ paddingTop: 80 }}>
        <div className="mx-auto max-w-[400px] space-y-5">

          {memo.type === "activite" ? (() => {
            // Parse from content_structured.resume (new) or transcription_raw (legacy)
            const raw = structured?.resume || memo.transcription_raw || "";
            const dashParts = raw.split("—").map((s) => s.trim());
            const activityName = dashParts[0] || "Activité";
            let durationStr = "—";
            let distanceStr = "—";
            let distanceUnit = "m";
            if (dashParts[1]) {
              const statsParts = dashParts[1].split("/").map((s) => s.trim());
              if (statsParts[0]) durationStr = statsParts[0];
              if (statsParts[1]) {
                distanceStr = statsParts[1];
                // Extract numeric value and unit
                const distMatch = distanceStr.match(/^([\d.,]+)\s*(.*)$/);
                if (distMatch) {
                  distanceUnit = distMatch[2]?.trim() || "m";
                }
              }
            }
            // Pure numeric distance for input
            const distanceNumeric = distanceStr !== "—" ? distanceStr.replace(/[^\d.,]/g, "") : "";

            // Find domain from tags
            const actTags = structured?.tags || [];
            const activeDomain = DOMAINS.find((d) => isDomainActive(d.key, actTags));

            const noteText = (structured as any)?.notes as string | undefined;

            // Helper to rebuild content_structured.resume
            const rebuildResume = (name: string, dur: string, dist: string) =>
            `${name} — ${dur} / ${dist}`;

            // Save helpers with feedback
            const saveActivityField = async (field: string, saveFn: () => Promise<void>) => {
              setActivitySaving(field);
              try {
                await saveFn();
                setActivitySaved(field);
                setTimeout(() => setActivitySaved(null), 1200);
              } catch {
                toast({ title: "Erreur", description: "Impossible de sauvegarder.", variant: "destructive" });
              }
              setActivitySaving(null);
            };

            const saveDuration = async (newDur: string) => {
              const newResume = rebuildResume(activityName, newDur, distanceStr);
              // Parse MM:SS to seconds
              const parts = newDur.split(":").map(Number);
              const secs = parts.length === 2 ? (parts[0] || 0) * 60 + (parts[1] || 0) : null;

              const updatedStructured = { ...(memo.content_structured || {}), resume: newResume };
              const updates: PromiseLike<any>[] = [
              supabase.from("memos").update({ content_structured: updatedStructured }).eq("id", memo.id).then()];

              if (secs !== null && memo.enfant_id) {
                updates.push(
                  supabase.from("sessions_activite").update({ duree_secondes: secs }).
                  eq("enfant_id", memo.enfant_id).
                  gte("created_at", `${memo.memo_date}T00:00:00`).
                  lt("created_at", `${memo.memo_date}T23:59:59.999`).then()
                );
              }
              await Promise.all(updates);
              await fetchMemo();
            };

            const saveDistance = async (newDist: string) => {
              const newResume = rebuildResume(activityName, durationStr, newDist);
              const distNum = parseFloat(newDist) || null;

              const updatedStructured = { ...(memo.content_structured || {}), resume: newResume };
              const updates: PromiseLike<any>[] = [
              supabase.from("memos").update({ content_structured: updatedStructured }).eq("id", memo.id).then()];

              if (distNum !== null && memo.enfant_id) {
                updates.push(
                  supabase.from("sessions_activite").update({ distance: distNum }).
                  eq("enfant_id", memo.enfant_id).
                  gte("created_at", `${memo.memo_date}T00:00:00`).
                  lt("created_at", `${memo.memo_date}T23:59:59.999`).then()
                );
              }
              await Promise.all(updates);
              await fetchMemo();
            };

            const saveNote = async (newNote: string) => {
              const updatedStructured = { ...(memo.content_structured || {}), notes: newNote || undefined };
              await supabase.from("memos").update({ content_structured: updatedStructured }).eq("id", memo.id);
              await fetchMemo();
            };

            const feedbackIcon = (field: string) => {
              if (activitySaving === field) return <Loader2 size={14} className="animate-spin" style={{ color: "#9A9490" }} />;
              if (activitySaved === field) return <Check size={14} style={{ color: "#44A882" }} />;
              return null;
            };

            return (
              <>
                {/* Date */}
                {editingField === "date" ?
                <div className="text-center">
                    <input
                    type="date"
                    defaultValue={memo.memo_date}
                    onChange={handleDateChange}
                    onBlur={() => setEditingField(null)}
                    autoFocus
                    className="text-sm border rounded-lg px-3 py-2 outline-none"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "#9A9490",
                      background: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.72)"
                    }} />
                  
                  </div> :

                <p
                  className={readOnly ? "text-center" : "text-center cursor-pointer"}
                  onClick={readOnly ? undefined : () => setEditingField("date")}
                  style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490" }}>
                  
                    {formattedDate}
                  </p>
                }

                {/* Intervenant picker */}
                {editingField === "intervenant" ?
                <div style={glassCard}>
                    <input
                    type="text"
                    value={intervenantSearch}
                    onChange={(e) => setIntervenantSearch(e.target.value)}
                    placeholder="Rechercher un membre..."
                    autoFocus
                    className="w-full text-sm outline-none mb-2"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 14,
                      color: "#1E1A1A",
                      background: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 8,
                      padding: "8px 12px"
                    }}
                    onBlur={() => {
                      setTimeout(() => {
                        if (editingField === "intervenant") setEditingField(null);
                      }, 200);
                    }} />
                  
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      <button
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleIntervenantSelect(null)}
                      className="w-full text-left text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40"
                      style={{ color: "#9A9490", fontStyle: "italic" }}>
                      
                        Aucun
                      </button>
                      {filteredIntervenants.map((i) => {
                      const { icon: Icon, gradient } = getSpecialiteAvatar(i.specialite);
                      return (
                        <button
                          key={i.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleIntervenantSelect(i.id)}
                          className="w-full text-left flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40">
                          
                            <div
                            className="flex items-center justify-center shrink-0"
                            style={{ width: 24, height: 24, borderRadius: "50%", background: gradient }}>
                            
                              <Icon size={12} color="#FFFFFF" />
                            </div>
                            <span style={{ color: "#1E1A1A" }}>
                              {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                            </span>
                          </button>);

                    })}
                    </div>
                  </div> :

                <div className="flex items-center justify-center gap-3">
                    <div
                    className={readOnly ? "flex items-center gap-2" : "flex items-center gap-2 cursor-pointer"}
                    onClick={readOnly ? undefined : () => setEditingField("intervenant")}>
                    
                      {intervenantName ?
                    <>
                          {(() => {
                        const { icon: Icon, gradient } = getSpecialiteAvatar(intervenantSpec);
                        return (
                          <div
                            className="flex items-center justify-center shrink-0"
                            style={{ width: 28, height: 28, borderRadius: "50%", background: gradient }}>
                            
                                <Icon size={14} color="#FFFFFF" />
                              </div>);

                      })()}
                          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#1E1A1A" }}>
                            {intervenantName}
                          </span>
                        </> :

                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#9A9490", fontStyle: "italic" }}>
                          Associer un membre...
                        </span>
                    }
                    </div>
                    {/* Domain badge — click to edit */}
                    {editingField === "actDomain" ? null :
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${readOnly ? "" : "cursor-pointer"}`}
                    onClick={readOnly ? undefined : () => setEditingField("actDomain")}
                    style={{
                      backgroundColor: activeDomain ? `${activeDomain.color}18` : "rgba(154,148,144,0.12)",
                      color: activeDomain?.color || "#9A9490"
                    }}>
                    
                        {activeDomain &&
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: activeDomain.color }} />
                    }
                        {activeDomain?.label || "Domaine"}
                      </span>
                  }
                  </div>
                }

                {/* Domain selector — shown when editing */}
                {editingField === "actDomain" &&
                <div style={glassCard}>
                    <p style={sectionLabel}>DOMAINE</p>
                    <div className="flex items-start justify-center gap-4">
                      {DOMAINS.map((domain) => {
                      const active = isDomainActive(domain.key, actTags);
                      return (
                        <button
                          key={domain.key}
                          onClick={() => {
                            handleDomainToggle(domain.key);
                            setTimeout(() => setEditingField(null), 300);
                          }}
                          className="flex flex-col items-center gap-1 bg-transparent border-none p-0 cursor-pointer">
                          
                            <div
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              backgroundColor: active ? domain.color : "transparent",
                              border: `2px solid ${domain.color}`,
                              opacity: active ? 1 : 0.35,
                              boxShadow: active ? `0 0 0 5px ${domain.color}38` : "none",
                              transition: "all 0.2s ease"
                            }} />
                          
                            <span
                            style={{
                              fontSize: 9,
                              fontFamily: "'DM Sans', sans-serif",
                              fontWeight: active ? 600 : 400,
                              color: active ? domain.color : "#9A9490",
                              opacity: active ? 1 : 0.5
                            }}>
                            
                              {domain.label}
                            </span>
                          </button>);

                    })}
                    </div>
                  </div>
                }

                {/* Activity title */}
                <h1
                  className="text-center"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: 20,
                    fontWeight: 700,
                    color: "#1E1A1A",
                    margin: 0
                  }}>
                  
                  {activityName}
                </h1>

                {/* Stats glass card — editable */}
                <div
                  style={{
                    ...glassCard,
                    background: "rgba(232,239,255,0.45)",
                    border: "1px solid rgba(139,116,224,0.2)"
                  }}>
                  
                  <div className="flex items-center justify-center gap-0">
                    {/* Duration */}
                    <div className="flex flex-col items-center flex-1">
                      {editingField === "actDuration" ?
                      <input
                        type="text"
                        defaultValue={durationStr !== "—" ? durationStr : ""}
                        placeholder="MM:SS"
                        autoFocus
                        onBlur={(e) => {
                          const val = e.target.value.trim() || "—";
                          setEditingField(null);
                          saveActivityField("duration", () => saveDuration(val));
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        className="text-center outline-none"
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#1E1A1A",
                          width: 90,
                          background: "rgba(255,255,255,0.5)",
                          border: "1px solid rgba(139,116,224,0.3)",
                          borderRadius: 8,
                          padding: "2px 4px"
                        }} /> :


                      <span
                        className={readOnly ? "" : "cursor-pointer"}
                        onClick={readOnly ? undefined : () => setEditingField("actDuration")}
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#1E1A1A",
                          lineHeight: 1.1
                        }}>
                        
                          {durationStr}
                        </span>
                      }
                      <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 500,
                            color: "#9A9490",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}>
                          
                          Durée
                        </span>
                        {feedbackIcon("duration")}
                      </div>
                    </div>
                    {/* Separator */}
                    <div
                      style={{
                        width: 1,
                        height: 36,
                        background: "rgba(139,116,224,0.2)",
                        flexShrink: 0
                      }} />
                    
                    {/* Distance */}
                    <div className="flex flex-col items-center flex-1">
                      {editingField === "actDistance" ?
                      <div className="flex items-baseline gap-1 justify-center">
                          <input
                          type="text"
                          inputMode="decimal"
                          defaultValue={distanceNumeric}
                          placeholder="0"
                          autoFocus
                          onBlur={(e) => {
                            const num = e.target.value.trim();
                            const val = num ? `${num} ${distanceUnit}` : "—";
                            setEditingField(null);
                            saveActivityField("distance", () => saveDistance(val));
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              (e.target as HTMLInputElement).blur();
                            }
                          }}
                          className="text-center outline-none"
                          style={{
                            fontFamily: "'Fraunces', serif",
                            fontSize: 28,
                            fontWeight: 700,
                            color: "#1E1A1A",
                            width: 70,
                            background: "rgba(255,255,255,0.5)",
                            border: "1px solid rgba(139,116,224,0.3)",
                            borderRadius: 8,
                            padding: "2px 4px"
                          }} />
                        
                          <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 14,
                            fontWeight: 500,
                            color: "#9A9490"
                          }}>
                          
                            {distanceUnit}
                          </span>
                        </div> :

                      <span
                        className={readOnly ? "" : "cursor-pointer"}
                        onClick={readOnly ? undefined : () => setEditingField("actDistance")}
                        style={{
                          fontFamily: "'Fraunces', serif",
                          fontSize: 28,
                          fontWeight: 700,
                          color: "#1E1A1A",
                          lineHeight: 1.1
                        }}>
                        
                          {distanceStr}
                        </span>
                      }
                      <div className="flex items-center gap-1" style={{ marginTop: 4 }}>
                        <span
                          style={{
                            fontFamily: "'DM Sans', sans-serif",
                            fontSize: 10,
                            fontWeight: 500,
                            color: "#9A9490",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em"
                          }}>
                          
                          Distance
                        </span>
                        {feedbackIcon("distance")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Note glass card — editable */}
                <div style={glassCard}>
                  <div className="flex items-center justify-between mb-2">
                    <p style={{ ...sectionLabel, marginBottom: 0 }}>NOTE</p>
                    {feedbackIcon("note")}
                  </div>
                  {editingField === "actNote" ?
                   <Textarea
                    defaultValue={noteText || ""}
                    autoFocus
                    rows={1}
                    onBlur={(e) => {
                      const val = e.target.value.trim();
                      setEditingField(null);
                      saveActivityField("note", () => saveNote(val));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        (e.target as HTMLTextAreaElement).blur();
                      }
                    }}
                    className="w-full outline-none resize-none min-h-0"
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      color: "#1E1A1A",
                      lineHeight: 1.6,
                      background: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(255,255,255,0.72)",
                      borderRadius: 8,
                      padding: "10px 12px"
                    }}
                    autoResize /> :


                  <div
                    className={readOnly ? "" : "cursor-pointer"}
                    onClick={readOnly ? undefined : () => setEditingField("actNote")}>
                    
                      {noteText ?
                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 15,
                        color: "#1E1A1A",
                        lineHeight: 1.6,
                        margin: 0
                      }}>
                      
                          {noteText}
                        </p> :

                    <p
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14,
                        color: "#9A9490",
                        fontStyle: "italic",
                        margin: 0
                      }}>
                      
                          Aucune note pour cette séance
                        </p>
                    }
                    </div>
                  }
                </div>
              </>);

          })() :
          <>
          {/* 1. DATE — inline edit */}
          {editingField === "date" ?
            <div className="text-center">
              <input
                type="date"
                defaultValue={memo.memo_date}
                onChange={handleDateChange}
                onBlur={() => setEditingField(null)}
                autoFocus
                className="text-sm border rounded-lg px-3 py-2 outline-none"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#9A9490",
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)"
                }} />
              
            </div> :

            <p
              className={readOnly ? "text-center" : "text-center cursor-pointer"}
              onClick={readOnly ? undefined : () => setEditingField("date")}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490" }}>
              
              {formattedDate}
            </p>
            }

          {/* 2. INTERVENANT — inline edit */}
          {editingField === "intervenant" ?
            <div style={glassCard}>
              <input
                type="text"
                value={intervenantSearch}
                onChange={(e) => setIntervenantSearch(e.target.value)}
                placeholder="Rechercher un membre..."
                autoFocus
                className="w-full text-sm outline-none mb-2"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: "#1E1A1A",
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "8px 12px"
                }}
                onBlur={() => {
                  // Delay to allow click on result
                  setTimeout(() => {
                    if (editingField === "intervenant") setEditingField(null);
                  }, 200);
                }} />
              
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleIntervenantSelect(null)}
                  className="w-full text-left text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40"
                  style={{ color: "#9A9490", fontStyle: "italic" }}>
                  
                  Aucun
                </button>
                {filteredIntervenants.map((i) => {
                  const { icon: Icon, gradient } = getSpecialiteAvatar(i.specialite);
                  return (
                    <button
                      key={i.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleIntervenantSelect(i.id)}
                      className="w-full text-left flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40">
                      
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 24, height: 24, borderRadius: "50%", background: gradient }}>
                        
                        <Icon size={12} color="#FFFFFF" />
                      </div>
                      <span style={{ color: "#1E1A1A" }}>
                        {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                      </span>
                    </button>);

                })}
              </div>
            </div> :

            <div
              className={readOnly ? "flex items-center justify-center gap-2" : "flex items-center justify-center gap-2 cursor-pointer"}
              onClick={readOnly ? undefined : () => setEditingField("intervenant")}>
              
              {intervenantName ?
              <>
                  {(() => {
                  const { icon: Icon, gradient } = getSpecialiteAvatar(intervenantSpec);
                  return (
                    <div
                      className="flex items-center justify-center shrink-0"
                      style={{ width: 32, height: 32, borderRadius: "50%", background: gradient }}>
                      
                        <Icon size={16} color="#FFFFFF" />
                      </div>);

                })()}
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1E1A1A" }}>
                    {intervenantName}{intervenantSpec ? ` · ${intervenantSpec}` : ""}
                  </span>
                </> :

              <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490", fontStyle: "italic" }}>
                  Associer un membre...
                </span>
              }
            </div>
            }

          {/* DOCUMENT FILE PREVIEW */}
          {memo.type === "document" &&
            <div style={glassCard}>
              <p style={sectionLabel}>FICHIER</p>
              {signedFileUrl ? (() => {
                const ext = (memo.file_url || "").split(".").pop()?.toLowerCase();
                const isImage = ["png", "jpg", "jpeg", "webp"].includes(ext || "");
                return (
                  <div>
                    {isImage ?
                    <img
                      src={signedFileUrl}
                      alt="Document"
                      className="w-full rounded-lg"
                      style={{ maxHeight: 400, objectFit: "contain", background: "rgba(0,0,0,0.03)" }} /> :


                    <div className="flex items-center gap-3 py-3">
                        <div
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 44, height: 44, borderRadius: 12,
                          background: "rgba(138,155,174,0.12)"
                        }}>
                        
                          <FileText size={22} color="#8A9BAE" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1E1A1A", fontWeight: 500 }}>
                            Document PDF
                          </p>
                          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 11, color: "#9A9490" }}>
                            Tap pour ouvrir
                          </p>
                        </div>
                      </div>
                    }
                    <button
                      onClick={() => {
                        if (signedFileUrl) {
                          
                          const opened = window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
                          if (!opened) {
                            fetch(signedFileUrl).
                            then((res) => res.blob()).
                            then((blob) => {
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = memo?.file_url?.split('/').pop() || 'document';
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              URL.revokeObjectURL(url);
                            }).
                            catch(() => toast({ title: "Impossible d'ouvrir le fichier", variant: "destructive" }));
                          }
                        }
                      }}
                      className="flex items-center justify-center gap-2 mt-3 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                      style={{
                        fontFamily: "'DM Sans', sans-serif",
                        background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                        color: "white",
                        border: "none"
                      }}>
                      
                      <ExternalLink size={14} />
                      Ouvrir le fichier
                    </button>
                  </div>);

              })() :
              <div className="flex items-center gap-3 py-3">
                  <FileText size={20} color="#9A9490" />
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490", fontStyle: "italic" }}>
                    Aucun fichier associé
                  </span>
                </div>
              }
            </div>
            }

          {/* 3. DOMAINES SELECTOR */}
          {isTextQuick && tags.length === 0 && !showDomaines ?
            <button
              onClick={() => setShowDomaines(true)}
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8B74E0", fontWeight: 500 }}>
              
              <Plus size={14} />
              Ajouter des domaines
            </button> :

            <div style={glassCard}>
            <p style={sectionLabel}>DOMAINES</p>
            <div className="flex items-start justify-center gap-4">
              {DOMAINS.map((domain) => {
                  const active = isDomainActive(domain.key, tags);
                  return (
                    <button
                      key={domain.key}
                      onClick={readOnly ? undefined : () => handleDomainToggle(domain.key)}
                      className={`flex flex-col items-center gap-1 bg-transparent border-none p-0 ${readOnly ? "" : "cursor-pointer"}`}>
                      
                    <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          backgroundColor: active ? domain.color : "transparent",
                          border: `2px solid ${domain.color}`,
                          opacity: active ? 1 : 0.35,
                          boxShadow: active ? `0 0 0 5px ${domain.color}38` : "none",
                          transition: "all 0.2s ease"
                        }} />
                      
                    <span
                        style={{
                          fontSize: 9,
                          fontFamily: "'DM Sans', sans-serif",
                          fontWeight: active ? 600 : 400,
                          color: active ? domain.color : "#9A9490",
                          opacity: active ? 1 : 0.5
                        }}>
                        
                      {domain.label}
                    </span>
                  </button>);

                })}
            </div>
            {/* Info button */}
            <button
                onClick={() => setShowDomaineInfo(true)}
                className="flex items-center gap-1 mx-auto mt-3 bg-transparent border-none cursor-pointer p-0">
                
              <Info size={14} color="#8B74E0" />
              <span style={{ fontSize: 11, color: "#9A9490", fontFamily: "'DM Sans', sans-serif" }}>
                Comment choisir un domaine ?
              </span>
            </button>
          </div>
            }

          {/* 4. RÉSUMÉ — inline edit */}
          <div style={glassCard}>
            <p style={sectionLabel}>TITRE</p>
            {editingField === "resume" ?
              <Textarea
                ref={resumeRef}
                value={tempResume}
                onChange={(e) => setTempResume(e.target.value)}
                onBlur={saveResume}
                rows={1}
                className="w-full outline-none resize-none min-h-0"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px"
                }}
                autoResize /> :


              <p
                className={readOnly ? "" : "cursor-pointer"}
                onClick={readOnly ? undefined : startEditResume}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  minHeight: 24
                }}>
                
                {structured?.resume || <span style={{ color: "#9A9490", fontStyle: "italic" }}>Ajouter un résumé...</span>}
              </p>
              }
          </div>

          {/* 5. DÉTAILS — inline edit */}
          <div style={glassCard}>
            <p style={sectionLabel}>{isTextQuick ? "VOTRE NOTE" : "DÉTAILS"}</p>
            {editingField === "details" ?
              <Textarea
                ref={detailsRef}
                value={tempDetails}
                onChange={(e) => setTempDetails(e.target.value)}
                onBlur={saveDetails}
                rows={1}
                placeholder={isTextQuick ? "Modifier votre note..." : "Un élément par ligne..."}
                className="w-full outline-none resize-none placeholder:text-[#9A9490] min-h-0"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px"
                }}
                autoResize /> :


              <div
                className={readOnly ? "" : "cursor-pointer"}
                onClick={readOnly ? undefined : () => {
                  if (isTextQuick) {
                    setTempDetails(details[0] || "");
                  } else {
                    setTempDetails(details.join("\n"));
                  }
                  setEditingField("details");
                  setTimeout(() => detailsRef.current?.focus(), 50);
                }}
                style={{ minHeight: 24 }}>
                
                {details.length > 0 ?
                isTextQuick ?
                <p style={{ fontSize: 15, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
                      {details[0]}
                    </p> :

                <ul className="space-y-1.5" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                      {details.map((d, i) =>
                  <li key={i} className="flex gap-2" style={{ fontSize: 15, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif" }}>
                          <span style={{ color: "#8B74E0", marginTop: 2 }}>•</span>
                          <span>{d}</span>
                        </li>
                  )}
                    </ul> :


                <span style={{ color: "#9A9490", fontStyle: "italic", fontSize: 15 }}>
                    {isTextQuick ? "Ajouter votre note..." : "Ajouter des détails..."}
                  </span>
                }
              </div>
              }
          </div>

          {/* 6. À RETENIR — inline edit */}
          {isTextQuick && suggestions.length === 0 && editingField !== "suggestions" ?
            <button
              onClick={() => {
                setTempSuggestions("");
                setEditingField("suggestions");
                setTimeout(() => suggestionsRef.current?.focus(), 50);
              }}
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8B74E0", fontWeight: 500 }}>
              
              <Plus size={14} />
              Ajouter des points à retenir
            </button> :

            <div style={glassCard}>
            <p style={sectionLabel}>À RETENIR</p>
            {editingField === "suggestions" ?
              <Textarea
                ref={suggestionsRef}
                value={tempSuggestions}
                onChange={(e) => setTempSuggestions(e.target.value)}
                onBlur={saveSuggestions}
                rows={1}
                placeholder="Un élément par ligne..."
                className="w-full outline-none resize-none placeholder:text-[#9A9490] min-h-0"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px"
                }}
                autoResize /> :


              <div
                className={readOnly ? "" : "cursor-pointer"}
                onClick={readOnly ? undefined : startEditSuggestions}
                style={{ minHeight: 24 }}>
                
                {suggestions.length > 0 ?
                <ul className="space-y-1.5" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {suggestions.map((s, i) =>
                  <li key={i} className="flex gap-2" style={{ fontSize: 15, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ marginTop: 2 }}>→</span>
                        <span>{s}</span>
                      </li>
                  )}
                  </ul> :

                <span style={{ color: "#9A9490", fontStyle: "italic", fontSize: 15 }}>Ajouter des notes...</span>
                }
              </div>
              }
          </div>
            }

          {/* 7. TAGS */}
          {isTextQuick && tags.length === 0 && !showTags ?
            <button
              onClick={() => setShowTags(true)}
              className="flex items-center gap-1.5 bg-transparent border-none cursor-pointer p-0 mx-auto"
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#8B74E0", fontWeight: 500 }}>
              
              <Plus size={14} />
              Ajouter des tags
            </button> :

            <div style={glassCard}>
            <p style={sectionLabel}>TAGS</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => {
                  const color = getDomainColor(tag);
                  return (
                    <span
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                      style={{ backgroundColor: `${color}15`, color }}>
                      
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
                    {tag}
                    {!readOnly &&
                      <button
                        onClick={() => removeTag(i)}
                        className="bg-transparent border-none p-0 cursor-pointer ml-0.5"
                        style={{ color }}>
                        
                        <X size={12} />
                      </button>
                      }
                  </span>);

                })}
            </div>
            {!readOnly &&
              <div className="flex gap-2">
                <input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {e.preventDefault();addTag();}
                  }}
                  placeholder="Ajouter un tag..."
                  className="flex-1 text-sm outline-none placeholder:text-[#9A9490]"
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: "#1E1A1A",
                    border: "1px solid rgba(255,255,255,0.72)",
                    borderRadius: 8,
                    padding: "6px 10px",
                    background: "rgba(255,255,255,0.5)"
                  }} />
                
                <button
                  onClick={addTag}
                  disabled={!newTag.trim()}
                  className="flex items-center gap-1 text-sm font-medium bg-transparent border-none cursor-pointer"
                  style={{ color: newTag.trim() ? "#E8736A" : "#9A9490" }}>
                  
                  <Plus size={14} />
                </button>
              </div>
              }
          </div>
            }
            </>
          }
        </div>
      </main>

      {/* Delete modal */}
      <AlertDialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <AlertDialogContent style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(20px)", borderRadius: 20 }}>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce mémo ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              style={{ backgroundColor: "#E8736A" }}>
              
              {deleting ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Domaines info modal */}
      <Dialog open={showDomaineInfo} onOpenChange={setShowDomaineInfo}>
        <DialogContent
          hideClose
          className="max-w-[340px]"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 20,
            padding: "24px 20px"
          }}>
          
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A", marginBottom: 16 }}>
            Les domaines de Selena
          </h3>
          <div className="space-y-4">
            {DOMAIN_INFO.map((d, i) =>
            <div key={i} className="flex items-start gap-3">
                <div style={{ width: 18, height: 18, borderRadius: "50%", backgroundColor: d.color, flexShrink: 0, marginTop: 2 }} />
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif" }}>
                    {d.label}
                  </p>
                  <p style={{ fontSize: 11, color: "#9A9490", fontFamily: "'DM Sans', sans-serif", lineHeight: 1.4 }}>
                    {d.desc}
                  </p>
                </div>
              </div>
            )}
          </div>
          <p style={{ fontSize: 11, color: "#9A9490", fontStyle: "italic", marginTop: 12, fontFamily: "'DM Sans', sans-serif" }}>
            Un mémo peut toucher plusieurs domaines à la fois.
          </p>
          <button
            onClick={() => setShowDomaineInfo(false)}
            className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.5)",
              border: "1px solid rgba(255,255,255,0.72)",
              color: "#1E1A1A"
            }}>
            
            Compris
          </button>
        </DialogContent>
      </Dialog>
    </div>);

};

export default MemoResult;