import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Copy, Share2, Pencil, RefreshCw, Sparkles, Settings, Stethoscope, BookOpen, Users, Mail } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

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
      style={{
        width: 40, height: 40, borderRadius: "50%",
        background: "linear-gradient(135deg, #E8736A, #8B74E0)",
        boxShadow: "0 0 16px rgba(139,116,224,0.4)",
      }}
    >
      <Sparkles size={18} color="#fff" />
    </div>
    <div className="flex-1 min-w-0">
      <span className="block mb-1 font-sans font-medium" style={{ color: "#8B74E0", fontSize: 11 }}>
        The Village
      </span>
      <div
        className="px-4 py-3 inline-block"
        style={{ ...glassCard, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(255,255,255,0.85)", maxWidth: "75%" }}
      >
        <p className={`text-[14px] font-sans leading-snug ${italic ? "italic" : ""}`} style={{ color: italic ? "#9A9490" : "#1E1A1A" }}>
          {text}
        </p>
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

// --- Thematic block card ---
interface ThematicBlockProps {
  icon: React.ReactNode;
  title: string;
  badge: string;
  body: string;
}

const ThematicBlock = ({ icon, title, badge, body }: ThematicBlockProps) => (
  <div className="mb-4 px-5 py-4" style={glassCard}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-[16px] font-serif font-semibold" style={{ color: "#1E1A1A" }}>{title}</h3>
    </div>
    <span
      className="inline-block px-2.5 py-0.5 text-[11px] font-sans font-medium mb-3"
      style={{ background: "rgba(139,116,224,0.12)", color: "#8B74E0", borderRadius: 999 }}
    >
      {badge}
    </span>
    <p className="text-[14px] font-sans leading-relaxed mb-3" style={{ color: "#1E1A1A" }}>{body}</p>
    <button
      className="w-full py-2.5 text-[13px] font-sans font-medium"
      style={{ border: "1.5px dashed #8B74E0", color: "#8B74E0", borderRadius: 12, background: "transparent" }}
    >
      ✏️ Préciser ce bloc
    </button>
  </div>
);

// --- Main ---
const CHIPS = ["Renouvellement MDPH", "Première demande", "Aggravation du handicap", "Changement de situation"];

const OutilsSyntheseMdph = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  type Phase = "context" | "result";
  const [phase, setPhase] = useState<Phase>("context");
  const [selectedChip, setSelectedChip] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");

  // Fetch memo count
  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("memos")
      .select("id", { count: "exact", head: true })
      .eq("enfant_id", enfantId)
      .then(({ count }) => setMemoCount(count ?? 0));
  }, [enfantId]);

  // Fetch parent name
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("prenom")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => { if (data?.prenom) setParentPrenom(data.prenom); });
  }, [user]);

  // Auto-scroll
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [phase]);

  const contextDisabled = phase !== "context";
  const contextText = selectedChip || freeText.trim() || "Aucun contexte ajouté";

  const handleGenerate = () => setPhase("result");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText("Contenu du dossier MDPH copié");
      toast({ title: "Copié dans le presse-papier ✅" });
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  // --- Sticky bottom ---
  const renderStickyBottom = () => {
    if (phase === "result") {
      return (
        <div
          className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3"
          style={{
            background: "rgba(255,255,255,0.72)",
            backdropFilter: "blur(20px) saturate(1.5)",
            WebkitBackdropFilter: "blur(20px) saturate(1.5)",
            borderTop: "1px solid rgba(255,255,255,0.6)",
            boxShadow: "0 -2px 12px rgba(0,0,0,0.05)",
          }}
        >
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9490" }} />
              <Input
                type="email"
                placeholder="ton@email.com"
                value={emailValue}
                onChange={(e) => setEmailValue(e.target.value)}
                className="pl-9 text-[13px] font-sans border-none"
                style={{ ...glassCard, borderRadius: 999, height: 44 }}
              />
            </div>
            <button
              className="px-5 py-2.5 text-[13px] font-sans font-semibold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                color: "#fff", borderRadius: 999, border: "none",
              }}
            >
              Envoyer →
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
        }}
      >
        <button
          onClick={handleGenerate}
          className="w-full py-3.5 text-[15px] font-sans font-semibold"
          style={{
            background: "linear-gradient(135deg, #E8736A, #8B74E0)",
            color: "#fff", borderRadius: 14, border: "none",
          }}
        >
          Générer le dossier →
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button onClick={() => navigate("/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>Dossier MDPH</h1>
      </header>

      <main className="flex-1 px-4 pt-5 pb-32">
        {/* BLOCK 1 — always visible */}
        <UserBubble text="📋 Dossier MDPH" />
        <SectionSeparator text={`Dossier MDPH — ${displayName}`} />

        <AiBubble text={`J'ai analysé ${memoCount ?? "…"} mémos de ${displayName}. J'ai déjà beaucoup de contexte.`} />
        <AiBubble text="Avant de générer, dis-moi ce que tu veux mettre en avant — ou ce que je ne sais pas encore." />
        <AiBubble text="Par exemple : un renouvellement en cours, une hospitalisation récente, un changement d'école, une demande spécifique d'aide..." italic />

        {/* Mic orb */}
        <div className="flex flex-col items-center gap-2 mb-5">
          <div
            className="flex items-center justify-center"
            style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              boxShadow: "0 0 24px rgba(139,116,224,0.4)",
              cursor: "not-allowed",
              opacity: contextDisabled ? 0.4 : 1,
            }}
          >
            <Mic size={30} color="#fff" />
          </div>
          <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>Appuie pour parler</span>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap justify-center gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              disabled={contextDisabled}
              onClick={() => {
                if (contextDisabled) return;
                setSelectedChip(selectedChip === c ? null : c);
                setFreeText("");
              }}
              className="w-fit px-3.5 py-2 text-[12px] font-sans transition-all text-left"
              style={{
                ...(selectedChip === c
                  ? { background: "#8B74E0", color: "#fff", borderRadius: 999, border: "none" }
                  : { ...glassCard, borderRadius: 999 }),
                opacity: contextDisabled ? 0.5 : 1,
                cursor: contextDisabled ? "default" : "pointer",
              }}
            >
              {c}
            </button>
          ))}
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
            disabled={contextDisabled}
            onChange={(e) => { setFreeText(e.target.value); if (e.target.value.trim()) setSelectedChip(null); }}
            className="text-[14px] font-sans border-none italic placeholder:italic"
            style={{ ...glassCard, borderRadius: 14, minHeight: 80, maxWidth: "80%" }}
          />
        </div>

        {/* BLOCK 2 — result */}
        {phase === "result" && (
          <>
            <UserBubble text={contextText} />
            <SectionSeparator text="Dossier MDPH" />

            <ThematicBlock
              icon={<Settings size={18} style={{ color: "#8B74E0" }} />}
              title="Autonomie au quotidien"
              badge="Dépendance totale"
              body={`${displayName} nécessite une aide humaine constante pour tous les actes de la vie quotidienne : toilette, habillage, alimentation, déplacements. L'enfant ne peut rester seul(e) et requiert une surveillance permanente en raison de troubles du comportement et d'un déficit de perception du danger.`}
            />
            <ThematicBlock
              icon={<Stethoscope size={18} style={{ color: "#8B74E0" }} />}
              title="Soins et suivi médical"
              badge="Suivi pluridisciplinaire intensif"
              body={`Le parcours de soins de ${displayName} comprend des séances hebdomadaires de kinésithérapie, ergothérapie et orthophonie, complétées par un suivi neuropédiatrique trimestriel. Les progrès sont réguliers mais nécessitent un maintien intensif de la prise en charge.`}
            />
            <ThematicBlock
              icon={<BookOpen size={18} style={{ color: "#8B74E0" }} />}
              title="Scolarité et apprentissages"
              badge="Accompagnement spécialisé"
              body={`${displayName} est scolarisé(e) en milieu ordinaire avec un(e) AESH à temps plein. Les adaptations pédagogiques incluent un emploi du temps aménagé, des supports visuels et un tiers-temps pour les évaluations. Les apprentissages fondamentaux progressent mais restent en décalage significatif.`}
            />
            <ThematicBlock
              icon={<Users size={18} style={{ color: "#8B74E0" }} />}
              title="Vie sociale et familiale"
              badge="Impact significatif"
              body={`Le handicap de ${displayName} a un impact majeur sur l'organisation familiale. Les parents doivent adapter leur emploi du temps professionnel et les activités de loisirs restent limitées. Les interactions sociales avec les pairs nécessitent un accompagnement constant.`}
            />

            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Synthèse des observations de {parentPrenom ?? "Parent"} pour {displayName} · The Village · Mars 2026
            </p>
          </>
        )}

        <div ref={bottomRef} />
      </main>

      {renderStickyBottom()}
      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseMdph;
