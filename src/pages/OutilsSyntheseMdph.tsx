import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Pencil, RefreshCw, Sparkles, Settings, Stethoscope, BookOpen, Users, Briefcase, Mail } from "lucide-react";
import WiredMicOrb from "@/components/synthese/WiredMicOrb";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import PreciserBlocDrawer from "@/components/synthese/PreciserBlocDrawer";

// --- Shared styles ---
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
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #E8736A, #8B74E0)", boxShadow: "0 0 16px rgba(139,116,224,0.4)" }}
    >
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

interface ChipGroupProps {
  chips: string[];
  selected: string[];
  multi?: boolean;
  disabled?: boolean;
  onToggle: (chip: string) => void;
}

const ChipGroup = ({ chips, selected, multi, disabled, onToggle }: ChipGroupProps) => (
  <div className="flex flex-wrap justify-center gap-2 my-4">
    {chips.map((c) => {
      const active = selected.includes(c);
      return (
        <button
          key={c}
          disabled={disabled}
          onClick={() => !disabled && onToggle(c)}
          className="w-fit px-3.5 py-2 text-[12px] font-sans transition-all text-left"
          style={{
            ...(active ? { background: "#8B74E0", color: "#fff", borderRadius: 999, border: "none" } : { ...glassCard, borderRadius: 999 }),
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          {c}
        </button>
      );
    })}
  </div>
);

interface ThematicBlockProps {
  icon: React.ReactNode;
  title: string;
  badge: string;
  body: string;
}

const ThematicBlock = ({ icon, title, badge, body, onPreciser }: ThematicBlockProps & { onPreciser?: () => void }) => (
  <div className="mb-4 px-5 py-4" style={glassCard}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-[16px] font-serif font-semibold" style={{ color: "#1E1A1A" }}>{title}</h3>
    </div>
    <span className="inline-block px-2.5 py-0.5 text-[11px] font-sans font-medium mb-3" style={{ background: "rgba(139,116,224,0.12)", color: "#8B74E0", borderRadius: 999 }}>
      {badge}
    </span>
    <p className="text-[14px] font-sans leading-relaxed mb-3" style={{ color: "#1E1A1A" }}>{body}</p>
    <button onClick={onPreciser} className="w-full py-2.5 text-[13px] font-sans font-medium" style={{ border: "1.5px dashed #8B74E0", color: "#8B74E0", borderRadius: 12, background: "transparent" }}>
      ✏️ Préciser ce bloc
    </button>
  </div>
);

// --- Questions config ---
const Q1_CHIPS = ["Première demande", "Renouvellement", "Évolution de situation"];
const Q2_CHIPS = ["AEEH / complément AEEH", "PCH", "SESSAD", "Carte mobilité", "Autre"];
const Q3_CHIPS = ["Nouveau diagnostic", "Nouveaux soins", "Changement situation pro", "Nouveau matériel", "Scolarisation à venir"];
const Q4_CHIPS = ["En emploi", "Arrêt lié au handicap", "Sans emploi", "Freelance / indépendant"];
const Q5_CHIPS = ["Entrée à l'école", "Mise en place SESSAD", "Nouveau matériel", "Plus d'autonomie"];

type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OutilsSyntheseMdph = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>(1);
  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[] | null>(null);
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);

  // Q1 single-select
  const [q1, setQ1] = useState<string | null>(null);
  // Q2 multi-select
  const [q2, setQ2] = useState<string[]>([]);
  // Q3 multi-select + textarea
  const [q3Chips, setQ3Chips] = useState<string[]>([]);
  const [q3Text, setQ3Text] = useState("");
  // Q4 single-select + textarea
  const [q4, setQ4] = useState<string | null>(null);
  const [q4Text, setQ4Text] = useState("");
  // Q5 multi-select + textarea
  const [q5Chips, setQ5Chips] = useState<string[]>([]);
  const [q5Text, setQ5Text] = useState("");
  // Q6 textarea only
  const [q6Text, setQ6Text] = useState("");

  useEffect(() => {
    if (!enfantId) return;
    supabase.from("memos").select("id", { count: "exact", head: true }).eq("enfant_id", enfantId).then(({ count }) => setMemoCount(count ?? 0));
  }, [enfantId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("prenom").eq("user_id", user.id).single().then(({ data }) => { if (data?.prenom) setParentPrenom(data.prenom); });
  }, [user]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [phase]);

  const toggleSingle = (val: string, current: string | null, setter: (v: string | null) => void) => {
    setter(current === val ? null : val);
  };

  const toggleMulti = (val: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(val) ? current.filter((c) => c !== val) : [...current, val]);
  };

  // Answer text helpers
  const q3Answer = () => {
    const parts = [...q3Chips];
    if (q3Text.trim()) parts.push(q3Text.trim());
    return parts.join(" · ") || "Aucun changement";
  };
  const q4Answer = () => q4 || q4Text.trim() || "Non précisé";
  const q5Answer = () => {
    const parts = [...q5Chips];
    if (q5Text.trim()) parts.push(q5Text.trim());
    return parts.join(" · ") || "Non précisé";
  };
  const q6Answer = () => q6Text.trim() || "Rien à ajouter";

  // CTA enabled states
  const cta1Enabled = !!q1;
  const cta2Enabled = q2.length > 0;
  const cta3Enabled = q3Chips.length > 0 || q3Text.trim().length > 0;
  const cta4Enabled = !!q4 || q4Text.trim().length > 0;
  const cta5Enabled = q5Chips.length > 0 || q5Text.trim().length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("Contenu du dossier MDPH copié");
      toast({ title: "Copié dans le presse-papier ✅" });
    } catch { toast({ title: "Impossible de copier", variant: "destructive" }); }
  };

  const handleGenerateMdph = async () => {
    if (!enfantId || !user) return;
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-synthesis", {
        body: {
          type: "mdph",
          enfant_id: enfantId,
          parent_context: {
            vocal_mdph: q6Text.trim() || null,
            type_demande: q1,
            objectifs: q2,
            changements: q3Answer(),
            situation_pro: q4Answer(),
            projet: q5Answer(),
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

  // --- CTA ---
  const renderCta = () => {
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

    const configs: Record<number, { label: string; enabled: boolean; next: Phase; action?: () => void }> = {
      1: { label: "Continuer →", enabled: cta1Enabled, next: 2 },
      2: { label: "Continuer →", enabled: cta2Enabled, next: 3 },
      3: { label: "Continuer →", enabled: cta3Enabled, next: 4 },
      4: { label: "Continuer →", enabled: cta4Enabled, next: 5 },
      5: { label: "Continuer →", enabled: cta5Enabled, next: 6 },
      6: { label: isGenerating ? "Génération en cours..." : "Générer le dossier →", enabled: !isGenerating, action: handleGenerateMdph, next: 7 },
    };

    const cfg = configs[phase];
    if (!cfg) return null;

    return (
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}>
        <button
          onClick={() => cfg.enabled && (cfg.action ? cfg.action() : setPhase(cfg.next))}
          disabled={!cfg.enabled}
          className={`w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity ${isGenerating ? "animate-pulse" : ""}`}
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", borderRadius: 14, border: "none", opacity: cfg.enabled ? 1 : 0.45 }}
        >
          {cfg.label}
        </button>
      </div>
    );
  };

  const past = (p: Phase) => phase > p;
  const current = (p: Phase) => phase === p;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>Dossier MDPH</h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-32">
        {/* BLOCK 1 — Q1 */}
        <UserBubble text="📋 Dossier MDPH" />
        <SectionSeparator text={`Dossier MDPH — ${displayName}`} />
        <AiBubble text="Pour préparer ton dossier, j'ai besoin de quelques infos que je n'ai pas dans tes mémos." />
        <AiBubble text="C'est quel type de demande ?" />
        <ChipGroup chips={Q1_CHIPS} selected={q1 ? [q1] : []} disabled={past(1)} onToggle={(c) => toggleSingle(c, q1, setQ1)} />

        {/* BLOCK 2 — Q2 */}
        {phase >= 2 && (
          <>
            <UserBubble text={q1!} />
            <AiBubble text="Qu'est-ce que tu souhaites obtenir ?" />
            <ChipGroup chips={Q2_CHIPS} selected={q2} multi disabled={past(2)} onToggle={(c) => toggleMulti(c, q2, setQ2)} />
          </>
        )}

        {/* BLOCK 3 — Q3 */}
        {phase >= 3 && (
          <>
            <UserBubble text={q2.join(" · ")} />
            <AiBubble text="Qu'est-ce qui a changé depuis ton dernier dossier ?" />
            <ChipGroup chips={Q3_CHIPS} selected={q3Chips} multi disabled={past(3)} onToggle={(c) => toggleMulti(c, q3Chips, setQ3Chips)} />
            <OrSeparator />
            <div className="mb-2 flex justify-end">
              <Textarea placeholder="Précise si besoin..." value={q3Text} disabled={past(3)} onChange={(e) => setQ3Text(e.target.value)} className="text-[14px] font-sans border-none italic placeholder:italic" style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }} autoResize />
            </div>
            <WiredMicOrb disabled={past(3)} onTranscription={(text) => setQ3Text((prev) => prev ? prev + " " + text : text)} />
          </>
        )}

        {/* BLOCK 4 — Q4 */}
        {phase >= 4 && (
          <>
            <UserBubble text={q3Answer()} />
            <AiBubble text="Ta situation professionnelle actuelle ?" />
            <ChipGroup chips={Q4_CHIPS} selected={q4 ? [q4] : []} disabled={past(4)} onToggle={(c) => toggleSingle(c, q4, setQ4)} />
            <OrSeparator />
            <div className="mb-5 flex justify-end">
              <Textarea placeholder="Précise si besoin..." value={q4Text} disabled={past(4)} onChange={(e) => { setQ4Text(e.target.value); if (e.target.value.trim()) setQ4(null); }} className="text-[14px] font-sans border-none italic placeholder:italic" style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }} autoResize />
            </div>
          </>
        )}

        {/* BLOCK 5 — Q5 */}
        {phase >= 5 && (
          <>
            <UserBubble text={q4Answer()} />
            <AiBubble text={`Quel est ton projet pour ${displayName} dans les 2-3 prochaines années ?`} />
            <ChipGroup chips={Q5_CHIPS} selected={q5Chips} multi disabled={past(5)} onToggle={(c) => toggleMulti(c, q5Chips, setQ5Chips)} />
            <OrSeparator />
            <div className="mb-2 flex justify-end">
              <Textarea placeholder="Décris ton projet..." value={q5Text} disabled={past(5)} onChange={(e) => setQ5Text(e.target.value)} className="text-[14px] font-sans border-none italic placeholder:italic" style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }} autoResize />
            </div>
            <WiredMicOrb disabled={past(5)} onTranscription={(text) => setQ5Text((prev) => prev ? prev + " " + text : text)} />
          </>
        )}

        {/* BLOCK 6 — Q6 */}
        {phase >= 6 && (
          <>
            <UserBubble text={q5Answer()} />
            <AiBubble text="Y a-t-il quelque chose d'important que je ne vois pas dans tes mémos ?" />
            <WiredMicOrb disabled={past(6)} onTranscription={(text) => setQ6Text((prev) => prev ? prev + " " + text : text)} />
            <OrSeparator />
            <div className="mb-5 flex justify-end">
              <Textarea placeholder="Ajoute ce que tu veux mettre en avant..." value={q6Text} disabled={past(6)} onChange={(e) => setQ6Text(e.target.value)} className="text-[14px] font-sans border-none italic placeholder:italic" style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }} />
            </div>
          </>
        )}

        {/* BLOCK 7 — Result */}
        {phase === 7 && (
          <>
            <UserBubble text={q6Answer()} />
            <SectionSeparator text="Dossier MDPH" />

            {generatedBlocks ? generatedBlocks.map((block: any, i: number) => {
              const iconMap: Record<string, React.ReactNode> = {
                Settings: <Settings size={18} style={{ color: "#8B74E0" }} />,
                Stethoscope: <Stethoscope size={18} style={{ color: "#8B74E0" }} />,
                BookOpen: <BookOpen size={18} style={{ color: "#8B74E0" }} />,
                Heart: <Briefcase size={18} style={{ color: "#8B74E0" }} />,
                Briefcase: <Briefcase size={18} style={{ color: "#8B74E0" }} />,
              };
              return (
                <ThematicBlock
                  key={block.id || i}
                  icon={iconMap[block.icon] || <Settings size={18} style={{ color: "#8B74E0" }} />}
                  title={block.title}
                  badge={block.badge || ""}
                  body={block.content}
                  onPreciser={() => setRefineBloc({ id: block.id, title: block.title, content: block.content, cas_usage: "mdph" })}
                />
              );
            }) : (
              <>
                <ThematicBlock icon={<Settings size={18} style={{ color: "#8B74E0" }} />} title="Autonomie au quotidien" badge="Dépendance totale" body={`${displayName} nécessite une aide humaine constante pour tous les actes de la vie quotidienne.`} />
                <ThematicBlock icon={<Stethoscope size={18} style={{ color: "#8B74E0" }} />} title="Soins et suivi médical" badge="Suivi pluridisciplinaire intensif" body={`Le parcours de soins de ${displayName} comprend des séances hebdomadaires.`} />
                <ThematicBlock icon={<BookOpen size={18} style={{ color: "#8B74E0" }} />} title="Scolarité et projet de vie" badge="Accompagnement spécialisé" body={`${displayName} est scolarisé(e) en milieu ordinaire avec accompagnement.`} />
                <ThematicBlock icon={<Briefcase size={18} style={{ color: "#8B74E0" }} />} title="Situation professionnelle" badge="Arrêt d'activité lié au handicap" body={`Le handicap de ${displayName} a un impact majeur sur l'organisation familiale.`} />
              </>
            )}

            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Synthèse des observations de {parentPrenom ?? "Parent"} pour {displayName} · The Village · Mars 2026
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

export default OutilsSyntheseMdph;
