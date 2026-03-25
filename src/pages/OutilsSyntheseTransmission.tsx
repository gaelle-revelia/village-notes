import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Sparkles, User, Brain, Moon, PersonStanding, Users, Pill, Activity, Mail } from "lucide-react";
import WiredMicOrb from "@/components/synthese/WiredMicOrb";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import PreciserBlocDrawer from "@/components/synthese/PreciserBlocDrawer";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const AiBubble = ({ text, italic }: { text: string; italic?: boolean }) => (
  <div className="flex items-end gap-3 mb-5">
    <div className="flex-shrink-0 flex items-center justify-center" style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #E8736A, #8B74E0)", boxShadow: "0 0 16px rgba(139,116,224,0.4)" }}>
      <Sparkles size={18} color="#fff" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="block mb-1 font-sans font-medium" style={{ color: "#8B74E0", fontSize: 11 }}>The Village</span>
      <div className="px-4 py-3 inline-block" style={{ ...glassCard, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.85)", maxWidth: "75%" }}>
        <p className={`text-[14px] font-sans leading-snug ${italic ? "italic" : ""}`} style={{ color: italic ? "#9A9490" : "#1E1A1A" }}>{text}</p>
      </div>
    </div>
  </div>
);

const UserBubble = ({ text }: { text: string }) => (
  <div className="flex justify-end mb-4">
    <div className="px-4 py-3 inline-block" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", borderRadius: 16, maxWidth: "70%" }}>
      <p className="text-[14px] font-sans leading-snug" style={{ color: "#fff" }}>{text}</p>
    </div>
  </div>
);

const SectionSeparator = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
    <span className="text-[10px] font-sans font-medium tracking-widest uppercase" style={{ color: "#9A9490" }}>{text}</span>
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
  </div>
);

// MicOrb removed — using WiredMicOrb instead

const OrSeparator = () => (
  <div className="flex justify-center my-4">
    <span className="text-[13px] font-sans" style={{ color: "#9A9490" }}>ou</span>
  </div>
);

const SectionProgress = ({ current }: { current: number }) => (
  <div className="my-5">
    <div className="flex items-center justify-between mb-2">
      <span className="text-[11px] font-sans font-medium" style={{ color: "#9A9490" }}>Section {current} sur 6</span>
    </div>
    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,116,224,0.12)" }}>
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(current / 6) * 100}%`, background: "#8B74E0" }} />
    </div>
  </div>
);

const SectionTag = ({ number, title }: { number: string; title: string }) => (
  <div className="mb-4">
    <span className="text-[15px] font-serif font-semibold" style={{ color: "#8B74E0" }}>{number} — {title}</span>
  </div>
);

interface ResultCardProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  showCopy?: boolean;
}

const ResultCard = ({ icon, title, body, onPreciser, showCopy }: ResultCardProps & { onPreciser?: () => void }) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="mb-4 px-5 py-4" style={glassCard}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-[16px] font-serif font-semibold" style={{ color: "#1E1A1A" }}>{title}</h3>
      </div>
      <p className="text-[14px] font-sans leading-relaxed mb-3" style={{ color: "#1E1A1A" }}>{body}</p>
      <div style={{ display: "flex", gap: 8 }}>
        {showCopy && (
          <button onClick={handleCopy} style={{ flex: 1, padding: 9, borderRadius: 10, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.48)", border: "1px solid rgba(139,116,224,0.3)", color: "#8B74E0", cursor: "pointer" }}>
            {copied ? "Copié ✓" : "Copier"}
          </button>
        )}
        <button onClick={onPreciser} className={`py-2.5 text-[13px] font-sans font-medium ${showCopy ? "" : "w-full"}`} style={{ flex: showCopy ? 1 : undefined, border: "1.5px dashed #8B74E0", color: "#8B74E0", borderRadius: 12, background: "transparent" }}>
          ✏️ Préciser ce bloc
        </button>
      </div>
    </div>
  );
};

const SECTIONS = [
  { number: "01", title: "Qui est {prenom} ?", question: "Décris-moi {prenom} en quelques mots — {pronom_tonique} personnalité, comment {pronom_sujet} communique, ce {pronom_rel} aime." },
  { number: "02", title: "{pronom_poss_maj} histoire et {pronom_poss} handicap", question: "Comment expliques-tu simplement {pronom_poss} handicap à quelqu'un qui ne connaît pas {prenom} ?" },
  { number: "03", title: "Fatigue — signes à repérer", question: "Comment reconnaît-on que {prenom} est fatigué{accord} ? Qu'est-ce qu'il faut faire dans ce cas ?" },
  { number: "04", title: "Comment {pronom_cod} positionner", question: "Quelles sont les positions importantes pour {prenom} et ce qu'il faut savoir pour bien {pronom_install} ?" },
  { number: "05", title: "Interaction avec les autres", question: "Comment les autres enfants et adultes doivent-ils interagir avec {pronom_cod_tonique} ? Quelles précautions ?" },
  { number: "06", title: "{pronom_poss_maj} thérapies en cours", question: "Quelles thérapies suit-{pronom_sujet} en ce moment et à quelle fréquence ?" },
];

const SECTION_HELPERS = [
  "Parle-moi {pronom_prep} comme tu le ferais à quelqu'un qui ne {pronom_cod2} jamais rencontré{accord}. Pas de jargon — juste {pronom_cod_tonique}.",
  "Pas besoin d'être précis médicalement. Comment tu l'expliques, toi, dans ta langue ?",
  "Tu {pronom_cod} connais mieux que personne. Qu'est-ce que tu as appris à repérer avec le temps ?",
  "Décris ce que tu fais au quotidien — les gestes, les habitudes, ce qui marche pour {pronom_cod_tonique}.",
  "Comment tu aimerais que les gens s'approchent {pronom_prep} ? Ce que tu aurais voulu savoir, toi, au début ?",
  "Cite juste les noms et la fréquence — le reste, The Village s'en occupe.",
];

const RESULT_CARDS = [
  { icon: <User size={18} style={{ color: "#8B74E0" }} />, title: "Qui est {prenom} ?", body: "" },
  { icon: <Brain size={18} style={{ color: "#8B74E0" }} />, title: "{pronom_poss_maj} histoire et {pronom_poss} handicap", body: "" },
  { icon: <Moon size={18} style={{ color: "#8B74E0" }} />, title: "Fatigue — signes à repérer", body: "" },
  { icon: <PersonStanding size={18} style={{ color: "#8B74E0" }} />, title: "Comment {pronom_cod} positionner", body: "" },
  { icon: <Users size={18} style={{ color: "#8B74E0" }} />, title: "Interaction avec les autres", body: "" },
  { icon: <Pill size={18} style={{ color: "#8B74E0" }} />, title: "{pronom_poss_maj} thérapies en cours", body: "" },
];

const DESTINATAIRES = [
  { emoji: "👶", label: "Babysitter" },
  { emoji: "🏫", label: "AESH" },
  { emoji: "👨‍👩‍👧", label: "Famille" },
  { emoji: "🏥", label: "Nouvelle structure" },
  { emoji: "🏕️", label: "Séjour / colonie" },
  { emoji: "", label: "Autre" },
];

type Phase = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OutilsSyntheseTransmission = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  const incomingSyntheseId = (location.state as any)?.syntheseId as string | undefined;
  const incomingReadOnly = (location.state as any)?.readOnly === true;

  const [phase, setPhase] = useState<Phase>(0);
  const [destinataire, setDestinataire] = useState<string | null>(null);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", "", ""]);
  const [emailValue, setEmailValue] = useState("");
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[] | null>(null);
  const [sexe, setSexe] = useState<string | null>(null);
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("prenom").eq("user_id", user.id).single().then(({ data }) => { if (data?.prenom) setParentPrenom(data.prenom); });
  }, [user]);

  useEffect(() => {
    if (!enfantId) return;
    supabase.from("enfants").select("sexe").eq("id", enfantId).single().then(({ data }: any) => { if (data?.sexe) setSexe(data.sexe); });
  }, [enfantId]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [phase]);

  // Read-only mode from Archives
  useEffect(() => {
    if (!incomingSyntheseId || !incomingReadOnly) return;
    const load = async () => {
      const { data } = await supabase
        .from("syntheses")
        .select("contenu, created_at")
        .eq("id", incomingSyntheseId)
        .single();
      if (!data?.contenu) return;
      try {
        const parsed = typeof data.contenu === "string" ? JSON.parse(data.contenu) : data.contenu;
        const blocks = parsed?.blocks ?? parsed;
        if (Array.isArray(blocks)) {
          setGeneratedBlocks(blocks);
          setSyntheseId(incomingSyntheseId);
          setPhase(7);
          setIsReadOnly(true);
        }
      } catch { /* ignore parse errors */ }
    };
    load();
  }, [incomingSyntheseId, incomingReadOnly]);

  const updateAnswer = (idx: number, val: string) => {
    setAnswers((prev) => { const n = [...prev]; n[idx] = val; return n; });
  };

  const handleGenerateTransmission = async () => {
    if (!enfantId || !user) return;
    setIsGenerating(true);
    try {
      const reponses = SECTIONS.map((s, i) => ({
        section: s.number,
        question: s.question,
        reponse: answers[i],
      }));
      const { data, error } = await supabase.functions.invoke("generate-synthesis", {
        body: {
          type: "transmission",
          enfant_id: enfantId,
          parent_context: {
            destinataire,
            reponses,
          },
        },
      });
      if (error) throw error;
      if (data?.blocks) {
        setGeneratedBlocks(data.blocks);
      }
      if (data?.synthese_id) setSyntheseId(data.synthese_id);
      setPhase(7);
    } catch (e) {
      console.error("generate-synthesis error:", e);
      toast({ title: "Une erreur est survenue — réessaie.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  const past = (p: Phase) => phase > p;

  // Replace placeholders with dynamic name and gendered pronouns
  const isFem = sexe !== "M"; // default feminine when unknown
  const q = (text: string) => {
    return text
      .replace(/\{prenom\}/g, displayName)
      .replace(/\{pronom_sujet\}/g, isFem ? "elle" : "il")
      .replace(/\{pronom_tonique\}/g, isFem ? "sa" : "sa")
      .replace(/\{pronom_poss\}/g, isFem ? "son" : "son")
      .replace(/\{pronom_poss_maj\}/g, isFem ? "Son" : "Son")
      .replace(/\{pronom_cod\}/g, isFem ? "la" : "le")
      .replace(/\{pronom_cod2\}/g, isFem ? "l'a" : "l'a")
      .replace(/\{pronom_cod_tonique\}/g, isFem ? "elle" : "lui")
      .replace(/\{pronom_rel\}/g, isFem ? "qu'elle" : "qu'il")
      .replace(/\{pronom_prep\}/g, isFem ? "d'elle" : "de lui")
      .replace(/\{pronom_install\}/g, isFem ? "l'installer" : "l'installer")
      .replace(/\{accord\}/g, isFem ? "e" : "");
  };

  const renderCta = () => {
    if (phase === 0) {
      const enabled = !!destinataire;
      return (
        <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}>
          <button
            onClick={() => enabled && setPhase(1)}
            disabled={!enabled}
            className="w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity"
            style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", borderRadius: 14, border: "none", opacity: enabled ? 1 : 0.45 }}
          >
            Commencer →
          </button>
        </div>
      );
    }

    if (phase === 7) {
      return (
        <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderTop: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 -2px 12px rgba(0,0,0,0.05)" }}>
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9490" }} />
              <Input type="email" placeholder="ton@email.com" value={emailValue} onChange={(e) => setEmailValue(e.target.value)} className="pl-9 text-[13px] font-sans border-none" style={{ ...glassCard, borderRadius: 999, height: 44 }} />
            </div>
            <button className="px-5 py-2.5 text-[13px] font-sans font-semibold flex-shrink-0" style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", borderRadius: 999, border: "none" }}>
              Envoyer →
            </button>
          </div>
        </div>
      );
    }

    const isLast = phase === 6;
    const enabled = answers[phase - 1].trim().length > 0 && !isGenerating;
    const label = isLast ? (isGenerating ? "Génération en cours..." : "Générer le livret complet →") : "Continuer →";
    const nextPhase = (phase + 1) as Phase;

    const handleCtaTap = async () => {
      if (!enabled) return;
      if (isLast) {
        await handleGenerateTransmission();
      } else {
        setPhase(nextPhase);
      }
    };

    return (
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}>
        <button
          onClick={handleCtaTap}
          disabled={!enabled}
          className={`w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity ${isGenerating ? "animate-pulse" : ""}`}
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", borderRadius: 14, border: "none", opacity: enabled ? 1 : 0.45 }}
        >
          {label}
        </button>
      </div>
    );
  };

  const renderSection = (idx: number) => {
    const s = SECTIONS[idx];
    const sectionPhase = (idx + 1) as Phase;
    const isPast = past(sectionPhase);

    return (
      <>
        {idx > 0 && <UserBubble text={answers[idx - 1] || "…"} />}
        <SectionProgress current={idx + 1} />
        <SectionTag number={s.number} title={q(s.title)} />
        <AiBubble text={q(s.question)} />
        <AiBubble text={q(SECTION_HELPERS[idx])} />
        <WiredMicOrb disabled={isPast} onTranscription={(text) => !isPast && updateAnswer(idx, (answers[idx] ? answers[idx] + " " : "") + text)} />
        <OrSeparator />
        <div className="mb-2 flex justify-end">
          <Textarea
            placeholder="Écris ici si tu préfères..."
            value={answers[idx]}
            disabled={isPast}
            onChange={(e) => !isPast && updateAnswer(idx, e.target.value)}
            className="text-[14px] font-sans border-none italic placeholder:italic"
            style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }}
            autoResize
          />
        </div>
      </>
    );
  };

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, "0")}/${(today.getMonth() + 1).toString().padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate(isReadOnly ? "/archives" : "/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>Transmission</h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-32">
        {/* Intro */}
        <UserBubble text="📖 Transmission" />
        <SectionSeparator text={`Transmission — ${displayName}`} />
        <AiBubble text={`Je vais te poser 6 questions pour construire le livret de ${displayName}.`} />
        <AiBubble text="Tu réponds à la voix ou à l'écrit, librement." />

        {/* Destinataire block */}
        <SectionSeparator text="POUR QUI CE LIVRET ?" />
        <AiBubble text="Avant de commencer, dis-moi pour qui tu prépares ce livret." />
        <AiBubble text="Le ton et les priorités s'adapteront automatiquement." />
        <div className="grid grid-cols-2 gap-2 mb-5 max-w-[320px] mx-auto">
          {DESTINATAIRES.map((d) => {
            const selected = destinataire === d.label;
            return (
              <button
                key={d.label}
                onClick={() => phase === 0 && setDestinataire(d.label)}
                disabled={phase > 0}
                className="py-2.5 px-3 text-[12px] font-sans font-medium transition-all"
                style={{
                  ...glassCard,
                  borderRadius: 999,
                  background: selected ? "rgba(139,116,224,0.15)" : "rgba(255,255,255,0.55)",
                  border: selected ? "1.5px solid #8B74E0" : "1px solid rgba(255,255,255,0.85)",
                  color: selected ? "#8B74E0" : "#1E1A1A",
                  opacity: phase > 0 && !selected ? 0.4 : 1,
                }}
              >
                {d.emoji ? `${d.emoji} ` : ""}{d.label}
              </button>
            );
          })}
        </div>

        {/* Section 1 — visible after destinataire */}
        {phase >= 1 && renderSection(0)}

        {/* Sections 2-6 */}
        {phase >= 2 && renderSection(1)}
        {phase >= 3 && renderSection(2)}
        {phase >= 4 && renderSection(3)}
        {phase >= 5 && renderSection(4)}
        {phase >= 6 && renderSection(5)}

        {/* Result */}
        {phase === 7 && (
          <>
            <UserBubble text={answers[5] || "…"} />
            <SectionSeparator text={`Livret de transmission — ${displayName}`} />
            {generatedBlocks ? generatedBlocks.map((block: any, i: number) => {
              const iconMap: Record<string, React.ReactNode> = {
                User: <User size={18} style={{ color: "#8B74E0" }} />,
                Brain: <Brain size={18} style={{ color: "#8B74E0" }} />,
                Moon: <Moon size={18} style={{ color: "#8B74E0" }} />,
                PersonStanding: <PersonStanding size={18} style={{ color: "#8B74E0" }} />,
                Users: <Users size={18} style={{ color: "#8B74E0" }} />,
                Activity: <Activity size={18} style={{ color: "#8B74E0" }} />,
                Pill: <Pill size={18} style={{ color: "#8B74E0" }} />,
              };
              return (
                <ResultCard
                  key={block.id || i}
                  icon={iconMap[block.icon] || <User size={18} style={{ color: "#8B74E0" }} />}
                  title={block.title}
                  body={block.content}
                  onPreciser={() => setRefineBloc({ id: block.id, title: block.title, content: block.content, cas_usage: "transmission" })}
                />
              );
            }) : RESULT_CARDS.map((card, i) => (
              <ResultCard key={i} icon={card.icon} title={q(card.title)} body={q(card.body)} />
            ))}
            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Document généré par The Village à partir des observations de {parentPrenom ?? "Parent"}. À compléter et personnaliser avant partage. Généré le {dateStr}.
            </p>
          </>
        )}

        <div ref={bottomRef} />
      </main>

      {renderCta()}

      <PreciserBlocDrawer
        isOpen={!!refineBloc}
        onClose={() => setRefineBloc(null)}
        bloc={refineBloc}
        enfantId={enfantId ?? ""}
        syntheseId={syntheseId ?? ""}
        onBlockUpdated={(blocId, newContent) => {
          setGeneratedBlocks((prev) => prev?.map((b) => b.id === blocId ? { ...b, content: newContent } : b) ?? null);
        }}
      />

      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseTransmission;
