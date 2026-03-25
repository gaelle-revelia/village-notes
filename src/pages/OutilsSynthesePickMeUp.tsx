import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Pencil, RefreshCw, CalendarIcon, Sparkles } from "lucide-react";
import WiredMicOrb from "@/components/synthese/WiredMicOrb";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import PreciserBlocDrawer from "@/components/synthese/PreciserBlocDrawer";

// --- Shared styles ---

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
  "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)"
};

const PERIODS = [
"Ce mois-ci",
"3 derniers mois",
"6 derniers mois",
"Depuis le début"];


// --- Sub-components ---

const AiBubble = ({ text }: {text: string;}) =>
<div className="flex items-end gap-3 mb-5">
    <div
    className="flex-shrink-0 flex items-center justify-center"
    style={{
      width: 40,
      height: 40,
      borderRadius: "50%",
      background: "linear-gradient(135deg, #E8736A, #8B74E0)",
      boxShadow: "0 0 16px rgba(139,116,224,0.4)"
    }}>
    
      <Sparkles size={18} color="#fff" className="flex-shrink-0 flex items-center justify-center" />
    </div>
    <div className="flex-1 min-w-0">
      <span
      className="block mb-1 font-sans font-medium"
      style={{ color: "#8B74E0", fontSize: 11 }}>
      
        The Village
      </span>
      <div
      className="px-4 py-3 inline-block"
      style={{
        ...glassCard,
        background: "rgba(255,255,255,0.55)",
        border: "1px solid rgba(255,255,255,0.85)",
        maxWidth: "75%"
      }}>
      
        <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
          {text}
        </p>
      </div>
    </div>
  </div>;


const UserBubble = ({ text }: {text: string;}) =>
<div className="flex justify-end mb-4">
    <div
    className="px-4 py-3 inline-block"
    style={{
      background: "linear-gradient(135deg, #E8736A, #8B74E0)",
      borderRadius: 16,
      maxWidth: "70%"
    }}>
    
      <p className="text-[14px] font-sans leading-snug" style={{ color: "#fff" }}>
        {text}
      </p>
    </div>
  </div>;


const SectionSeparator = ({ text }: {text: string;}) =>
<div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
    <span
    className="text-[10px] font-sans font-medium tracking-widest uppercase"
    style={{ color: "#9A9490" }}>
    
      {text}
    </span>
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
  </div>;


// --- Helpers ---

function computeDateRange(period: string): {start: Date;end: Date;} {
  const now = new Date();
  const end = now;
  switch (period) {
    case "Ce mois-ci":
      return { start: startOfMonth(now), end };
    case "3 derniers mois":
      return { start: subMonths(now, 3), end };
    case "6 derniers mois":
      return { start: subMonths(now, 6), end };
    case "Depuis le début":
      return { start: new Date("2020-01-01"), end };
    default:
      return { start: subMonths(now, 3), end };
  }
}

// --- Main component ---

const OutilsSynthesePickMeUp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  // Read-only mode from Archives
  const locState = location.state as { syntheseId?: string; readOnly?: boolean } | null;
  const isReadOnly = !!(locState?.syntheseId && locState?.readOnly);

  const EMOTIONS = [
  "Je suis épuisé(e)",
  "Je traverse un moment de doute",
  `Voir où en est ${displayName}`,
  "Je veux faire un point étape"];


  // Phase model
  type Phase = "emotion" | "period" | "result";
  const [phase, setPhase] = useState<Phase>("emotion");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);
  const [etatEmotionnel, setEtatEmotionnel] = useState<string | null>(null);
  const [periodDebut, setPeriodDebut] = useState<string | null>(null);
  const [periodFin, setPeriodFin] = useState<string | null>(null);
  const [syntheseDate, setSyntheseDate] = useState<string | null>(null);

  // Block 1 state
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");

  // Block 2 state
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<Date | undefined>(subMonths(new Date(), 3));
  const [dateEnd, setDateEnd] = useState<Date | undefined>(new Date());
  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [activiteCount, setActiviteCount] = useState<number | null>(null);

  // Parent name
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.
    from("profiles").
    select("prenom").
    eq("user_id", user.id).
    single().
    then(({ data }) => {
      if (data?.prenom) setParentPrenom(data.prenom);
    });
  }, [user]);

  // Read-only: fetch synthese and jump to result
  useEffect(() => {
    if (!isReadOnly || !locState?.syntheseId) return;
    setSyntheseId(locState.syntheseId);
    supabase
      .from("syntheses")
      .select("contenu, created_at, etat_emotionnel, periode_debut, periode_fin")
      .eq("id", locState.syntheseId)
      .single()
      .then(({ data }) => {
        if (!data?.contenu) return;
        try {
          const parsed = JSON.parse(data.contenu);
          let text: string;
          let etatResume: string | null = null;
          if (parsed?.blocks && Array.isArray(parsed.blocks)) {
            text = parsed.blocks[0]?.content ?? data.contenu;
            etatResume = parsed.etat_emotionnel_resume ?? null;
          } else if (Array.isArray(parsed)) {
            text = parsed[0]?.content ?? data.contenu;
          } else {
            text = parsed?.content ?? data.contenu;
          }
          setGeneratedContent(text ?? data.contenu);
          // Determine emotional label
          const emotionLabel = etatResume
            ?? (data.etat_emotionnel
              ? (data.etat_emotionnel.length > 80 ? data.etat_emotionnel.slice(0, 80) + "…" : data.etat_emotionnel)
              : null);
          setEtatEmotionnel(emotionLabel);
        } catch {
          setGeneratedContent(data.contenu);
        }
        if (data.periode_debut) setPeriodDebut(data.periode_debut);
        if (data.periode_fin) setPeriodFin(data.periode_fin);
        if (data.created_at) {
          setSyntheseDate(new Date(data.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }));
        }
        setPhase("result");
      });
  }, [isReadOnly, locState?.syntheseId]);

  // Auto-scroll on phase change
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, [phase, memoCount, activiteCount]);

  // Derived
  const emotionText = selectedEmotion || freeText.trim();
  const hasEmotion = emotionText.length > 0;

  const periodText = selectedPeriod ?
  selectedPeriod :
  dateStart && dateEnd ?
  `Du ${format(dateStart, "d MMM yyyy", { locale: fr })} au ${format(dateEnd, "d MMM yyyy", { locale: fr })}` :
  null;
  const hasPeriod = !!periodText;

  // Fetch counts when period changes (only in period phase)
  const fetchCounts = useCallback(async (start: Date, end: Date) => {
    if (!enfantId) return;
    const startDate = format(start, "yyyy-MM-dd");
    const endDate = format(end, "yyyy-MM-dd");
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const [memosRes, sessionsRes] = await Promise.all([
    supabase.
    from("memos").
    select("id", { count: "exact", head: true }).
    eq("enfant_id", enfantId).
    gte("memo_date", startDate).
    lte("memo_date", endDate),
    supabase.
    from("sessions_activite").
    select("id", { count: "exact", head: true }).
    eq("enfant_id", enfantId).
    gte("created_at", startISO).
    lte("created_at", endISO)]
    );
    setMemoCount(memosRes.count ?? 0);
    setActiviteCount(sessionsRes.count ?? 0);
  }, [enfantId]);

  useEffect(() => {
    if (phase !== "period" && phase !== "result") return;
    if (selectedPeriod) {
      const { start, end } = computeDateRange(selectedPeriod);
      fetchCounts(start, end);
    } else if (dateStart && dateEnd) {
      fetchCounts(dateStart, dateEnd);
    } else {
      setMemoCount(null);
      setActiviteCount(null);
    }
  }, [phase, selectedPeriod, dateStart, dateEnd, fetchCounts]);

  const displayContent = generatedContent ?? `Ces derniers mois, ${displayName} a fait des pas incroyables. Là où certains gestes semblaient impossibles, ils sont devenus naturels. Les professionnels qui l'accompagnent remarquent une vraie ouverture, une curiosité nouvelle. Ce n'est pas un hasard — c'est le fruit de ta présence, de ta patience, de chaque rendez-vous honoré, de chaque exercice répété à la maison. ${displayName} avance, et c'est aussi grâce à toi.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(displayContent);
      toast({ title: "Copié dans le presse-papier ✅" });
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  const handleGenerate = async () => {
    if (!enfantId || !user) return;
    setIsGenerating(true);
    try {
      const range = selectedPeriod
        ? computeDateRange(selectedPeriod)
        : { start: dateStart!, end: dateEnd! };
      const { data, error } = await supabase.functions.invoke("generate-synthesis", {
        body: {
          type: "pick_me_up",
          enfant_id: enfantId,
          parent_context: {
            etat_emotionnel: emotionText,
            periode_debut: format(range.start, "yyyy-MM-dd"),
            periode_fin: format(range.end, "yyyy-MM-dd"),
          },
        },
      });
      if (error) throw error;
      const blocks = data?.blocks;
      if (blocks?.[0]?.content) {
        setGeneratedContent(blocks[0].content);
      }
      if (data?.synthese_id) setSyntheseId(data.synthese_id);
      setPhase("result");
    } catch (e) {
      console.error("generate-synthesis error:", e);
      toast({ title: "Une erreur est survenue — réessaie.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const emotionDisabled = phase !== "emotion";
  const periodDisabled = phase !== "period";

  // --- Sticky CTA / action bar ---
  const renderStickyBottom = () => {
    if (phase === "result") {
      if (isReadOnly) {
        return (
          <div
            className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3 flex items-center justify-around"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px) saturate(1.5)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              borderTop: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 -2px 12px rgba(0,0,0,0.05)"
            }}>
            <button
              onClick={handleCopy}
              className="flex flex-col items-center gap-1 text-[11px] font-sans"
              style={{ color: "#1E1A1A" }}>
              <Copy size={18} />
              Copier
            </button>
          </div>
        );
      }
      return (
        <div
          className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3 flex items-center justify-around"
          style={{
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            borderTop: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.05)"
          }}>
          
          {[
          { icon: Copy, label: "Copier", action: handleCopy },
          { icon: Share2, label: "Partager", action: () => {} },
          { icon: Pencil, label: "Modifier", action: () => {} },
          { icon: RefreshCw, label: "Régénérer", action: () => {} }].
          map(({ icon: Icon, label, action }) =>
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-1 text-[11px] font-sans"
            style={{ color: "#1E1A1A" }}>
            
              <Icon size={18} />
              {label}
            </button>
          )}
        </div>);

    }

    const isEmotion = phase === "emotion";
    const enabled = isEmotion ? hasEmotion : (hasPeriod && !isGenerating);
    const label = isEmotion ? "Continuer →" : isGenerating ? "Génération en cours..." : "Analyser →";
    const onTap = () => {
      if (isEmotion) setPhase("period");
      else handleGenerate();
    };

    return (
      <div
        className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)"
        }}>
        
        <button
          disabled={!enabled}
          onClick={onTap}
          className="w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity"
          style={{
            background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            color: "#fff",
            borderRadius: 14,
            border: "none",
            opacity: enabled ? 1 : 0.4,
            cursor: enabled ? "pointer" : "not-allowed"
          }}>
          
          {label}
        </button>
      </div>);

  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header — fixed title "Pick-me-up", back always to /outils/synthese */}
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)"
        }}>
        
        <button onClick={() => navigate(isReadOnly ? "/archives" : "/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>
          Pick-me-up
        </h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-32">
        {/* ===== BLOCK 1 — always visible (hidden in readOnly) ===== */}
        {!isReadOnly && <>
        <AiBubble text="De quoi as-tu besoin aujourd'hui ?" />
        <UserBubble text="✨ Un remontant" />
        <SectionSeparator text={`Un remontant — ${displayName}`} />
        <AiBubble text="Dis-moi comment tu te sens en ce moment." />
        <AiBubble text="Pas besoin d'être précis(e) — quelques mots, ce qui vient." />

        {/* Mic orb */}
        <WiredMicOrb
          disabled={emotionDisabled}
          onTranscription={(text) => {
            setFreeText((prev) => prev ? prev + " " + text : text);
          }}
        />

        {/* Emotion chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {EMOTIONS.map((e) =>
          <button
            key={e}
            disabled={emotionDisabled}
            onClick={() => {
              if (emotionDisabled) return;
              setSelectedEmotion(e);
              setFreeText("");
              setPhase("period");
            }}
            className="w-fit px-3.5 py-2 text-[12px] font-sans transition-all text-left"
            style={{
              ...(selectedEmotion === e ?
              { background: "#8B74E0", color: "#fff", borderRadius: 999, border: "none" } :
              { ...glassCard, borderRadius: 999 }),
              opacity: emotionDisabled ? 0.5 : 1,
              cursor: emotionDisabled ? "default" : "pointer"
            }}>
            
              {e}
            </button>
          )}
        </div>

        {/* "ou" separator */}
        <div className="flex justify-center my-4">
          <span className="text-[13px] font-sans" style={{ color: "#9A9490" }}>ou</span>
        </div>

        {/* Textarea */}
        <div className="mb-5 flex justify-end">
          <Textarea
            placeholder="Écris ici si tu préfères..."
            value={freeText}
            disabled={emotionDisabled}
            onChange={(e) => {
              setFreeText(e.target.value);
              if (e.target.value.trim()) setSelectedEmotion(null);
            }}
            className="text-[14px] font-sans border-none italic placeholder:italic"
            style={{ ...glassCard, borderRadius: 14, minHeight: 80, maxWidth: "75%" }}
            autoResize />
          
        </div>
        </>}

        {/* ===== BLOCK 2 — visible when phase >= 'period' (hidden in readOnly) ===== */}
        {!isReadOnly && (phase === "period" || phase === "result") &&
        <>
            {/* User bubble echoing emotion */}
            <UserBubble text={emotionText} />

            <SectionSeparator text="Période" />

            <AiBubble text="Sur quelle période tu veux qu'on regarde ?" />

            {/* Period chips */}
            <div className="flex flex-wrap justify-center gap-2">
              {PERIODS.map((p) =>
            <button
              key={p}
              disabled={periodDisabled}
              onClick={() => {
                if (selectedPeriod === p) {
                  setSelectedPeriod(null);
                } else {
                  setSelectedPeriod(p);
                }
                setDateStart(undefined);
                setDateEnd(undefined);
              }}
              className="w-fit px-3.5 py-2 text-[12px] font-sans transition-all text-left"
              style={{
                ...(selectedPeriod === p ?
                { background: "#8B74E0", color: "#fff", borderRadius: 999, border: "none" } :
                { ...glassCard, borderRadius: 999 }),
                opacity: periodDisabled ? 0.5 : 1,
                cursor: periodDisabled ? "default" : "pointer"
              }}>
              
                  {p}
                </button>
            )}
            </div>

            {/* Date range picker — liquid glass card */}
            <div
            className="mb-5 mt-4"
            style={{
              background: "rgba(255,255,255,0.38)",
              backdropFilter: "blur(16px) saturate(1.6)",
              WebkitBackdropFilter: "blur(16px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.85)",
              borderRadius: 16,
              padding: 16
            }}>
            
              <div className="flex justify-center mb-3">
                <span className="text-[10px] font-sans font-medium tracking-widest uppercase" style={{ color: "#9A9490" }}>
                  Ou choisir une période précise
                </span>
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    disabled={periodDisabled}
                    className={cn("flex-1 justify-start text-left text-[13px] font-normal", !dateStart && "text-muted-foreground")}
                    style={{ borderRadius: 999 }}>
                    
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateStart ? format(dateStart, "d MMM yyyy", { locale: fr }) : "Du"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="single"
                    selected={dateStart}
                    onSelect={(d) => {setDateStart(d || undefined);setSelectedPeriod(null);}}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")} />
                  
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                    variant="outline"
                    disabled={periodDisabled}
                    className={cn("flex-1 justify-start text-left text-[13px] font-normal", !dateEnd && "text-muted-foreground")}
                    style={{ borderRadius: 999 }}>
                    
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateEnd ? format(dateEnd, "d MMM yyyy", { locale: fr }) : "Au"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                    mode="single"
                    selected={dateEnd}
                    onSelect={(d) => {setDateEnd(d || undefined);setSelectedPeriod(null);}}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")} />
                  
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Counter card */}
            {hasPeriod && memoCount !== null && activiteCount !== null &&
          <div className="mb-5 px-4 py-3" style={{ ...glassCard }}>
                <p className="text-[13px] font-sans text-center" style={{ color: "#1E1A1A" }}>
                  <Sparkles size={14} className="inline mr-1" style={{ color: "#8B74E0" }} />
                  <span className="font-semibold">{memoCount}</span> mémo{memoCount !== 1 ? "s" : ""} · <span className="font-semibold">{activiteCount}</span> activité{activiteCount !== 1 ? "s" : ""} sur <span className="italic">{periodText}</span>
                </p>
              </div>
          }
          </>
        }

        {/* ===== BLOCK 3 — visible when phase === 'result' ===== */}
        {phase === "result" &&
        <>
            {!isReadOnly && periodText && <UserBubble text={periodText} />}

            <SectionSeparator text="Ton remontant" />

            {isReadOnly && (() => {
              const fmtDate = (d: string) => {
                const date = new Date(d + "T00:00:00");
                return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
              };
              const periodLabel = periodDebut && periodFin
                ? `du ${fmtDate(periodDebut)} au ${fmtDate(periodFin)}`
                : null;
              const syntheseDate = syntheseId ? new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : null;
              return (
                <div style={{
                  borderLeft: "3px solid #8B74E0",
                  background: "rgba(139,116,224,0.06)",
                  borderRadius: "0 10px 10px 0",
                  padding: "10px 13px",
                  marginBottom: 12
                }}>
                  <p style={{ fontSize: 11, color: "#8B74E0", margin: "0 0 2px", fontWeight: 500 }}>
                    Remontant du {syntheseDate}
                  </p>
                  {(etatEmotionnel || periodLabel) && (
                    <p style={{ fontSize: 11, color: "#9A9490", margin: 0 }}>
                      {[etatEmotionnel, periodLabel].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="px-5 py-4 mb-4" style={{ ...glassCard }}>
              <p className="text-[14px] font-sans leading-relaxed" style={{ color: "#1E1A1A" }}>
                {displayContent}
              </p>
            </div>
            {isReadOnly && (
              <button
                onClick={handleCopy}
                className="w-full mb-6 font-sans"
                style={{
                  padding: 9,
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 500,
                  background: "rgba(255,255,255,0.48)",
                  border: "1px solid rgba(139,116,224,0.3)",
                  color: "#8B74E0",
                }}
              >
                <Copy size={13} className="inline mr-1" style={{ verticalAlign: "-2px" }} />
                Copier
              </button>
            )}
            {!isReadOnly && <button
              onClick={() => setRefineBloc({ id: "narrative", title: "Ce qui s'est passé", content: displayContent, cas_usage: "pick_me_up" })}
              className="w-full py-2.5 text-[13px] font-sans font-medium mb-6"
              style={{ border: "1.5px dashed #8B74E0", color: "#8B74E0", borderRadius: 12, background: "transparent" }}
            >
              ✏️ Préciser ce bloc
            </button>}

            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Synthèse des observations de {parentPrenom ?? "Parent"} pour {displayName} · The Village · Mars 2026
            </p>
          </>
        }

        {/* Scroll anchor */}
        <div ref={bottomRef} />
      </main>

      {/* Sticky CTA / action bar */}
      {!isReadOnly && renderStickyBottom()}

      <PreciserBlocDrawer
        isOpen={!!refineBloc}
        onClose={() => setRefineBloc(null)}
        bloc={refineBloc}
        enfantId={enfantId ?? ""}
        syntheseId={syntheseId ?? ""}
        onBlockUpdated={(blocId, newContent) => {
          if (blocId === "narrative") setGeneratedContent(newContent);
        }}
      />

      <BottomNavBar />
    </div>);

};

export default OutilsSynthesePickMeUp;