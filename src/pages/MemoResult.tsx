import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft, Trash2, X, Plus, Info, Activity, Hand, Brain, Stethoscope, MessageCircle, User, Heart, Waves, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

// --- Types ---
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

// --- Domain system ---
const DOMAINS = [
  { key: "moteur", label: "Moteur", color: "#E8736A", keywords: ["moteur", "motricite", "motricité", "kine", "kiné", "physique", "kinésithérapie"] },
  { key: "cognitif", label: "Cognitif", color: "#8B74E0", keywords: ["cognitif", "psychomoteur", "psychomotricite", "psychomotricité"] },
  { key: "sensoriel", label: "Sensoriel", color: "#44A882", keywords: ["sensoriel", "communication", "langage", "orthophonie"] },
  { key: "bien-etre", label: "Bien-être", color: "#E8A44A", keywords: ["bien-etre", "bien-être", "emotionnel", "émotionnel", "sommeil", "alimentation"] },
  { key: "medical", label: "Médical", color: "#8A9BAE", keywords: ["medical", "médical", "administratif"] },
];

const DOMAIN_INFO = [
  { label: "Moteur & physique", color: "#E8736A", desc: "Tout ce qui touche au corps : tonus, posture, motricité, déplacements" },
  { label: "Cognitif & psychomoteur", color: "#8B74E0", desc: "Compréhension, attention, mémoire, coordination gestes-pensée" },
  { label: "Sensoriel & communication", color: "#44A882", desc: "Réactions aux sons, au toucher, au regard, langage et expression" },
  { label: "Bien-être & émotionnel", color: "#E8A44A", desc: "Humeur, fatigue, sommeil, appétit, confort au quotidien" },
  { label: "Médical & administratif", color: "#8A9BAE", desc: "Rendez-vous médicaux, bilans, MDPH, matériel" },
];

function isDomainActive(domainKey: string, tags: string[]): boolean {
  const domain = DOMAINS.find(d => d.key === domainKey);
  if (!domain) return false;
  return tags.some(t => domain.keywords.some(kw => t.toLowerCase().includes(kw)));
}

function getDomainColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const d of DOMAINS) {
    if (d.keywords.some(kw => lower.includes(kw))) return d.color;
  }
  return "#8A9BAE";
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

// --- Styles ---
const glassCard: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.52)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255, 255, 255, 0.72)",
  borderRadius: 16,
  padding: "16px 20px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.8)",
};

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: "0.08em",
  color: "#9A9490",
  marginBottom: 8,
};

const MemoResult = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();

  const [memo, setMemo] = useState<MemoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  // Swipe navigation between memos
  const [memoIds, setMemoIds] = useState<string[]>([]);
  const [swipeFade, setSwipeFade] = useState(false);
  const swipeStart = useRef<{ x: number; y: number } | null>(null);

  // Per-field editing
  const [editingField, setEditingField] = useState<string | null>(null);
  const [intervenantSearch, setIntervenantSearch] = useState("");
  const [showDomaineInfo, setShowDomaineInfo] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newTag, setNewTag] = useState("");

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
    const { data } = await supabase
      .from("memos")
      .select("id, memo_date, type, content_structured, transcription_raw, intervenant_id, enfant_id, file_url, intervenants(nom, specialite)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (data) setMemo(data as any);
    setLoading(false);
  }, [id, user]);

  useEffect(() => { fetchMemo(); }, [fetchMemo]);

  // Fade in when memo changes
  useEffect(() => {
    setSwipeFade(false);
  }, [id]);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => setIntervenants(data || []));
  }, [enfantId]);

  // Fetch ordered memo IDs for swipe navigation
  useEffect(() => {
    if (!user) return;
    supabase
      .from("memos")
      .select("id")
      .eq("user_id", user.id)
      .order("memo_date", { ascending: true })
      .order("created_at", { ascending: true })
      .then(({ data }) => {
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
    const { error } = await supabase.from("memos").delete().eq("id", memo.id);
    if (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer.", variant: "destructive" });
      setDeleting(false);
      return;
    }
    toast({ title: "Mémo supprimé", duration: 2000 });
    navigate("/timeline");
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
    const domain = DOMAINS.find(d => d.key === domainKey)!;
    const active = isDomainActive(domainKey, tags);

    let newTags: string[];
    if (active) {
      // Remove all tags matching this domain
      newTags = tags.filter(t => !domain.keywords.some(kw => t.toLowerCase().includes(kw)));
    } else {
      // Add primary tag
      newTags = [...tags, domainKey];
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
    const items = tempDetails.split("\n").filter(l => l.trim());
    const updatedStructured = { ...(memo.content_structured || {}), details: items };
    autoSave({ content_structured: updatedStructured });
    setEditingField(null);
  };

  const saveSuggestions = () => {
    if (!memo) return;
    const items = tempSuggestions.split("\n").filter(l => l.trim());
    const updatedStructured = { ...(memo.content_structured || {}), suggestions: items };
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
    setTempSuggestions((memo?.content_structured?.suggestions || []).join("\n"));
    setEditingField("suggestions");
    setTimeout(() => suggestionsRef.current?.focus(), 50);
  };

  // --- Rendering guards ---
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
  const intervenantData = memo.intervenants as any;
  const intervenantName = intervenantData?.nom || null;
  const intervenantSpec = intervenantData?.specialite || null;
  const formattedDate = format(new Date(memo.memo_date), "dd MMMM yyyy", { locale: fr });

  // Intervenant search filtering
  const filteredIntervenants = intervenants.filter(i =>
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
        transition: "opacity 0.2s ease-out",
      }}
    >
      {/* Swipe arrow indicators */}
      {hasPrev && (
        <div
          className="fixed left-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          <ChevronLeft size={24} color="#9A9490" />
        </div>
      )}
      {hasNext && (
        <div
          className="fixed right-2 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
          style={{ opacity: 0.3 }}
        >
          <ChevronRight size={24} color="#9A9490" />
        </div>
      )}
      {/* Header */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button
          onClick={() => navigate("/timeline")}
          className="bg-transparent border-none cursor-pointer p-1"
          aria-label="Retour"
        >
          <ArrowLeft size={22} color="#1E1A1A" />
        </button>
        <button
          onClick={() => setDeleteModalOpen(true)}
          className="bg-transparent border-none cursor-pointer p-1"
          aria-label="Supprimer"
        >
          <Trash2 size={20} color="#E8736A" />
        </button>
      </header>

      <main className="flex-1 px-4 pb-8" style={{ paddingTop: 80 }}>
        <div className="mx-auto max-w-[400px] space-y-5">

          {/* 1. DATE — inline edit */}
          {editingField === "date" ? (
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
                  border: "1px solid rgba(255,255,255,0.72)",
                }}
              />
            </div>
          ) : (
            <p
              className="text-center cursor-pointer"
              onClick={() => setEditingField("date")}
              style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490" }}
            >
              {formattedDate}
            </p>
          )}

          {/* 2. INTERVENANT — inline edit */}
          {editingField === "intervenant" ? (
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
                  padding: "8px 12px",
                }}
                onBlur={() => {
                  // Delay to allow click on result
                  setTimeout(() => {
                    if (editingField === "intervenant") setEditingField(null);
                  }, 200);
                }}
              />
              <div className="max-h-[200px] overflow-y-auto space-y-1">
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleIntervenantSelect(null)}
                  className="w-full text-left text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40"
                  style={{ color: "#9A9490", fontStyle: "italic" }}
                >
                  Aucun
                </button>
                {filteredIntervenants.map((i) => {
                  const { icon: Icon, gradient } = getSpecialiteAvatar(i.specialite);
                  return (
                    <button
                      key={i.id}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleIntervenantSelect(i.id)}
                      className="w-full text-left flex items-center gap-2 text-sm py-2 px-3 rounded-lg bg-transparent border-none cursor-pointer hover:bg-white/40"
                    >
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 24, height: 24, borderRadius: "50%", background: gradient }}
                      >
                        <Icon size={12} color="#FFFFFF" />
                      </div>
                      <span style={{ color: "#1E1A1A" }}>
                        {i.nom}{i.specialite ? ` · ${i.specialite}` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center gap-2 cursor-pointer"
              onClick={() => setEditingField("intervenant")}
            >
              {intervenantName ? (
                <>
                  {(() => {
                    const { icon: Icon, gradient } = getSpecialiteAvatar(intervenantSpec);
                    return (
                      <div
                        className="flex items-center justify-center shrink-0"
                        style={{ width: 32, height: 32, borderRadius: "50%", background: gradient }}
                      >
                        <Icon size={16} color="#FFFFFF" />
                      </div>
                    );
                  })()}
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#1E1A1A" }}>
                    {intervenantName}{intervenantSpec ? ` · ${intervenantSpec}` : ""}
                  </span>
                </>
              ) : (
                <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: "#9A9490", fontStyle: "italic" }}>
                  Associer un membre...
                </span>
              )}
            </div>
          )}

          {/* 3. DOMAINES SELECTOR */}
          <div style={glassCard}>
            <p style={sectionLabel}>DOMAINES</p>
            <div className="flex items-start justify-center gap-4">
              {DOMAINS.map((domain) => {
                const active = isDomainActive(domain.key, tags);
                return (
                  <button
                    key={domain.key}
                    onClick={() => handleDomainToggle(domain.key)}
                    className="flex flex-col items-center gap-1 bg-transparent border-none cursor-pointer p-0"
                  >
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: "50%",
                        backgroundColor: active ? domain.color : "transparent",
                        border: `2px solid ${domain.color}`,
                        opacity: active ? 1 : 0.35,
                        boxShadow: active ? `0 0 0 5px ${domain.color}38` : "none",
                        transition: "all 0.2s ease",
                      }}
                    />
                    <span
                      style={{
                        fontSize: 9,
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: active ? 600 : 400,
                        color: active ? domain.color : "#9A9490",
                        opacity: active ? 1 : 0.5,
                      }}
                    >
                      {domain.label}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Info button */}
            <button
              onClick={() => setShowDomaineInfo(true)}
              className="flex items-center gap-1 mx-auto mt-3 bg-transparent border-none cursor-pointer p-0"
            >
              <Info size={14} color="#8B74E0" />
              <span style={{ fontSize: 11, color: "#9A9490", fontFamily: "'DM Sans', sans-serif" }}>
                Comment choisir un domaine ?
              </span>
            </button>
          </div>

          {/* 4. RÉSUMÉ — inline edit */}
          <div style={glassCard}>
            <p style={sectionLabel}>RÉSUMÉ</p>
            {editingField === "resume" ? (
              <textarea
                ref={resumeRef}
                value={tempResume}
                onChange={(e) => setTempResume(e.target.value)}
                onBlur={saveResume}
                rows={3}
                className="w-full outline-none resize-none"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              />
            ) : (
              <p
                className="cursor-pointer"
                onClick={startEditResume}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  minHeight: 24,
                }}
              >
                {structured?.resume || <span style={{ color: "#9A9490", fontStyle: "italic" }}>Ajouter un résumé...</span>}
              </p>
            )}
          </div>

          {/* 5. DÉTAILS — inline edit */}
          <div style={glassCard}>
            <p style={sectionLabel}>DÉTAILS</p>
            {editingField === "details" ? (
              <textarea
                ref={detailsRef}
                value={tempDetails}
                onChange={(e) => setTempDetails(e.target.value)}
                onBlur={saveDetails}
                rows={4}
                placeholder="Un élément par ligne..."
                className="w-full outline-none resize-none placeholder:text-[#9A9490]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              />
            ) : (
              <div
                className="cursor-pointer"
                onClick={startEditDetails}
                style={{ minHeight: 24 }}
              >
                {details.length > 0 ? (
                  <ul className="space-y-1.5" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {details.map((d, i) => (
                      <li key={i} className="flex gap-2" style={{ fontSize: 15, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ color: "#8B74E0", marginTop: 2 }}>•</span>
                        <span>{d}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: "#9A9490", fontStyle: "italic", fontSize: 15 }}>Ajouter des détails...</span>
                )}
              </div>
            )}
          </div>

          {/* 6. À RETENIR — inline edit */}
          <div style={glassCard}>
            <p style={sectionLabel}>À RETENIR</p>
            {editingField === "suggestions" ? (
              <textarea
                ref={suggestionsRef}
                value={tempSuggestions}
                onChange={(e) => setTempSuggestions(e.target.value)}
                onBlur={saveSuggestions}
                rows={3}
                placeholder="Un élément par ligne..."
                className="w-full outline-none resize-none placeholder:text-[#9A9490]"
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 15,
                  color: "#1E1A1A",
                  lineHeight: 1.6,
                  background: "rgba(255,255,255,0.5)",
                  border: "1px solid rgba(255,255,255,0.72)",
                  borderRadius: 8,
                  padding: "10px 12px",
                }}
              />
            ) : (
              <div
                className="cursor-pointer"
                onClick={startEditSuggestions}
                style={{ minHeight: 24 }}
              >
                {suggestions.length > 0 ? (
                  <ul className="space-y-1.5" style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    {suggestions.map((s, i) => (
                      <li key={i} className="flex gap-2" style={{ fontSize: 15, color: "#1E1A1A", fontFamily: "'DM Sans', sans-serif" }}>
                        <span style={{ marginTop: 2 }}>→</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: "#9A9490", fontStyle: "italic", fontSize: 15 }}>Ajouter des notes...</span>
                )}
              </div>
            )}
          </div>

          {/* 7. TAGS — always visible */}
          <div style={glassCard}>
            <p style={sectionLabel}>TAGS</p>
            <div className="flex flex-wrap gap-2 mb-3">
              {tags.map((tag, i) => {
                const color = getDomainColor(tag);
                return (
                  <span
                    key={i}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
                    style={{ backgroundColor: `${color}15`, color }}
                  >
                    <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: color }} />
                    {tag}
                    <button
                      onClick={() => removeTag(i)}
                      className="bg-transparent border-none p-0 cursor-pointer ml-0.5"
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addTag(); }
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
                  background: "rgba(255,255,255,0.5)",
                }}
              />
              <button
                onClick={addTag}
                disabled={!newTag.trim()}
                className="flex items-center gap-1 text-sm font-medium bg-transparent border-none cursor-pointer"
                style={{ color: newTag.trim() ? "#E8736A" : "#9A9490" }}
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
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
              style={{ backgroundColor: "#E8736A" }}
            >
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
            padding: "24px 20px",
          }}
        >
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A", marginBottom: 16 }}>
            Les domaines de Selena
          </h3>
          <div className="space-y-4">
            {DOMAIN_INFO.map((d, i) => (
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
            ))}
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
              color: "#1E1A1A",
            }}
          >
            Compris
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MemoResult;
