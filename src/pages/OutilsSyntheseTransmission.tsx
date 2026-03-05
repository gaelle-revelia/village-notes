import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Sparkles, User, Brain, Moon, PersonStanding, Users, Pill, Mail } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

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

const MicOrb = () => (
  <div className="flex flex-col items-center gap-2 mb-5">
    <div className="flex items-center justify-center" style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg, #E8736A, #8B74E0)", boxShadow: "0 0 24px rgba(139,116,224,0.4)", cursor: "not-allowed", opacity: 0.4 }}>
      <Mic size={30} color="#fff" />
    </div>
    <span className="text-[12px] font-sans" style={{ color: "#9A9490" }}>Appuie pour parler</span>
  </div>
);

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
      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(current / 6) * 100}%`, background: "linear-gradient(135deg, #E8736A, #8B74E0)" }} />
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
}

const ResultCard = ({ icon, title, body }: ResultCardProps) => (
  <div className="mb-4 px-5 py-4" style={glassCard}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <h3 className="text-[16px] font-serif font-semibold" style={{ color: "#1E1A1A" }}>{title}</h3>
    </div>
    <p className="text-[14px] font-sans leading-relaxed mb-3" style={{ color: "#1E1A1A" }}>{body}</p>
    <button className="w-full py-2.5 text-[13px] font-sans font-medium" style={{ border: "1.5px dashed #8B74E0", color: "#8B74E0", borderRadius: 12, background: "transparent" }}>
      ✏️ Préciser ce bloc
    </button>
  </div>
);

const SECTIONS = [
  { number: "01", title: "Qui est Selena ?", question: "Décris-moi Selena en quelques mots — sa personnalité, comment elle communique, ce qu'elle aime." },
  { number: "02", title: "Son histoire et son handicap", question: "Comment expliques-tu simplement son handicap à quelqu'un qui ne connaît pas Selena ?" },
  { number: "03", title: "Fatigue — signes à repérer", question: "Comment reconnaît-on que Selena est fatiguée ? Qu'est-ce qu'il faut faire dans ce cas ?" },
  { number: "04", title: "Comment la positionner", question: "Quelles sont les positions importantes pour Selena et ce qu'il faut savoir pour bien l'installer ?" },
  { number: "05", title: "Interaction avec les autres", question: "Comment les autres enfants et adultes doivent-ils interagir avec elle ? Quelles précautions ?" },
  { number: "06", title: "Ses thérapies en cours", question: "Quelles thérapies suit-elle en ce moment et à quelle fréquence ?" },
];

const RESULT_CARDS = [
  { icon: <User size={18} style={{ color: "#8B74E0" }} />, title: "Qui est Selena ?", body: "Selena est une petite fille de 4 ans pleine de vie, avec un sourire communicatif. Elle s'exprime principalement par les gestes et les regards. Elle adore la musique, les jeux d'eau et les câlins. Elle est très sensible aux voix douces et aux environnements calmes." },
  { icon: <Brain size={18} style={{ color: "#8B74E0" }} />, title: "Son histoire et son handicap", body: "Selena présente un retard global de développement avec une composante motrice importante. Elle se déplace en poussette adaptée et commence à explorer la station assise avec support. Son parcours de soins est suivi depuis l'âge de 8 mois." },
  { icon: <Moon size={18} style={{ color: "#8B74E0" }} />, title: "Fatigue — signes à repérer", body: "Quand Selena est fatiguée, elle détourne le regard, devient plus raide dans son corps et peut pleurer sans raison apparente. Il faut alors la mettre dans un endroit calme, réduire les stimulations et lui proposer un temps de repos allongée sur le côté gauche." },
  { icon: <PersonStanding size={18} style={{ color: "#8B74E0" }} />, title: "Comment la positionner", body: "Selena doit être installée dans sa coque moulée pour les temps d'activité. En dehors, elle peut être assise dans son siège adapté avec les sangles bien ajustées. Attention à toujours soutenir sa tête lors des transferts. Ne jamais la laisser sur le ventre sans surveillance." },
  { icon: <Users size={18} style={{ color: "#8B74E0" }} />, title: "Interaction avec les autres", body: "Se placer à sa hauteur et lui parler doucement en la regardant. Éviter les gestes brusques. Les autres enfants peuvent jouer avec elle en lui présentant des objets un par un. Elle aime qu'on lui chante des comptines et qu'on lui tienne la main." },
  { icon: <Pill size={18} style={{ color: "#8B74E0" }} />, title: "Ses thérapies en cours", body: "Kinésithérapie 3×/semaine (motricité, verticalisation). Ergothérapie 1×/semaine (préhension, installation). Orthophonie 2×/semaine (communication alternative). Psychomotricité 1×/semaine (schéma corporel, stimulations sensorielles)." },
];

type Phase = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const OutilsSyntheseTransmission = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>(1);
  const [answers, setAnswers] = useState<string[]>(["", "", "", "", "", ""]);
  const [emailValue, setEmailValue] = useState("");
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("prenom").eq("user_id", user.id).single().then(({ data }) => { if (data?.prenom) setParentPrenom(data.prenom); });
  }, [user]);

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [phase]);

  const updateAnswer = (idx: number, val: string) => {
    setAnswers((prev) => { const n = [...prev]; n[idx] = val; return n; });
  };

  const past = (p: Phase) => phase > p;

  // Replace "Selena" with dynamic name in questions
  const q = (text: string) => text.replace(/Selena/g, displayName);

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

    const isLast = phase === 6;
    const enabled = answers[phase - 1].trim().length > 0;
    const label = isLast ? "Générer le livret complet →" : "Continuer →";
    const nextPhase = (phase + 1) as Phase;

    return (
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}>
        <button
          onClick={() => enabled && setPhase(nextPhase)}
          disabled={!enabled}
          className="w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity"
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
        <MicOrb />
        <OrSeparator />
        <div className="mb-2 flex justify-end">
          <Textarea
            placeholder="Écris ici si tu préfères..."
            value={answers[idx]}
            disabled={isPast}
            onChange={(e) => !isPast && updateAnswer(idx, e.target.value)}
            className="text-[14px] font-sans border-none italic placeholder:italic"
            style={{ ...glassCard, borderRadius: 14, minHeight: 70, maxWidth: "80%" }}
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
        <button onClick={() => navigate("/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
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

        {/* Section 1 — always visible */}
        {renderSection(0)}

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
            {RESULT_CARDS.map((card, i) => (
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
      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseTransmission;
