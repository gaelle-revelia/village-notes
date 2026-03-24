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
const Q2_CHIPS = ["AEEH / complément AEEH", "PCH", "Carte mobilité", "AVPF", "Je ne sais pas", "Autre"];
const Q3_CHIPS = ["Nouveau diagnostic", "Nouveaux soins", "Changement situation pro", "Nouveau matériel", "Scolarisation à venir"];
const Q4_CHIPS = ["En emploi", "Temps partiel lié au handicap", "Arrêt maladie", "Arrêt d'activité lié au handicap", "Sans emploi", "Freelance / indépendant"];
const Q5_CHIPS = ["🏫 Scolarisée", "🌱 Entrée à l'école prévue", "🏥 Orientation médico-sociale", "— Pas encore scolarisée"];
const Q6_CHIPS = ["Plus d'autonomie", "Entrée à l'école", "Mise en place SESSAD", "Nouveau matériel", "Maintien des droits actuels", "Autre"];
const Q8_CHIPS = ["Oui, je l'ai", "Pas encore", "Certificat simplifié"];

const OutilsSyntheseMdph = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";
  const bottomRef = useRef<HTMLDivElement>(null);

  // --- Question states ---
  const [currentQ, setCurrentQ] = useState(1);
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3Chips, setQ3Chips] = useState<string[]>([]);
  const [q3Vocal, setQ3Vocal] = useState("");
  const [q4, setQ4] = useState<string | null>(null);
  const [q4Vocal, setQ4Vocal] = useState("");
  const [q4TiercePersonne, setQ4TiercePersonne] = useState<boolean | null>(null);
  const [q4HeuresTierce, setQ4HeuresTierce] = useState("");
  const [q5, setQ5] = useState<string | null>(null);
  const [q6Chips, setQ6Chips] = useState<string[]>([]);
  const [q6Vocal, setQ6Vocal] = useState("");
  const [q7, setQ7] = useState("");
  
  const [q8Etat, setQ8Etat] = useState<string | null>(null);
  const [q8Vocal, setQ8Vocal] = useState("");

  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [generatedBlocks, setGeneratedBlocks] = useState<any[] | null>(null);
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);

  // --- Visibility rules ---
  const showQ1 = true;
  const showQ2 = currentQ >= 2;
  const showQ3 = currentQ >= 3 && (q1 === "Renouvellement" || q1 === "Évolution de situation");
  const showQ4 = currentQ >= 4;
  const showQ5 = currentQ >= 5;
  const showQ6 = currentQ >= 6;
  const showQ7 = currentQ >= 7;
  const showQ8 = currentQ >= 8;
  const showResults = generatedBlocks !== null;

  // --- Progress bar ---
  const progressPercent = (currentQ / 8) * 100;

  // --- Step navigation ---
  const isCurrentStepValid = () => {
    switch (currentQ) {
      case 1: return q1 !== null;
      case 2: return q2.length > 0;
      case 3: return q3Chips.length > 0 || q3Vocal.trim().length > 0;
      case 4: return q4 !== null;
      case 5: return q5 !== null;
      case 6: return q6Chips.length > 0 || q6Vocal.trim().length > 0;
      case 7: return true;
      case 8: return q8Etat !== null;
      default: return false;
    }
  };

  const advanceStep = () => {
    if (currentQ === 8) { handleGenerateMdph(); return; }
    let next = currentQ + 1;
    if (currentQ === 2 && !(q1 === "Renouvellement" || q1 === "Évolution de situation")) {
      next = 4;
    }
    setCurrentQ(next);
  };

  // --- Q3 skip edge case ---
  useEffect(() => {
    if (currentQ === 3 && !(q1 === "Renouvellement" || q1 === "Évolution de situation")) {
      setCurrentQ(4);
    }
  }, [currentQ, q1]);

  // --- Data fetching ---
  useEffect(() => {
    if (!enfantId) return;
    supabase.from("memos").select("id", { count: "exact", head: true }).eq("enfant_id", enfantId).then(({ count }) => setMemoCount(count ?? 0));
  }, [enfantId]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("prenom").eq("user_id", user.id).single().then(({ data }) => { if (data?.prenom) setParentPrenom(data.prenom); });
  }, [user]);

  // --- Auto-scroll ---
  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, [currentQ]);

  const toggleSingle = (val: string, current: string | null, setter: (v: string | null) => void) => {
    setter(current === val ? null : val);
  };

  const toggleMulti = (val: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(val) ? current.filter((c) => c !== val) : [...current, val]);
  };

  // Answer text helpers
  const q3Answer = (): string | null => {
    const parts = [...q3Chips];
    if (q3Vocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.length > 0 ? parts.join(" · ") : null;
  };
  const q4Answer = () => {
    const parts: string[] = [];
    if (q4) parts.push(q4);
    if (q4Vocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.join(" · ") || "Non précisé";
  };
  const q5Answer = () => q5 || "Non précisé";
  const q6Answer = () => {
    const parts = [...q6Chips];
    if (q6Vocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.join(" · ") || "Non précisé";
  };
  const q8Answer = () => {
    const parts: string[] = [];
    if (q8Etat) parts.push(q8Etat);
    if (q8Etat === "Oui, je l'ai" && q8Vocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.join(" · ") || "Rien à ajouter";
  };

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
            vocal_mdph: q8Vocal.trim() || null,
            type_demande: q1,
            objectifs: q2,
            changements: q3Answer(),
            situation_pro: q4Answer(),
            projet: q6Answer(),
          },
        },
      });
      if (error) throw error;
      if (data?.blocks) {
        setGeneratedBlocks(data.blocks);
      }
      if (data?.synthese_id) setSyntheseId(data.synthese_id);
    } catch (e) {
      console.error("generate-synthesis error:", e);
      toast({ title: "Une erreur est survenue — réessaie.", variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  // --- CTA ---
  const renderCta = () => {
    const ctaEnabled = isCurrentStepValid() && !isGenerating && !isRecording;
    const ctaLabel = currentQ === 8
      ? (isGenerating ? "Génération en cours..." : "Générer mon dossier →")
      : "Continuer →";

    return (
      <div className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)" }}>
        <button
          onClick={advanceStep}
          disabled={!ctaEnabled}
          className={`w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity ${isGenerating ? "animate-pulse" : ""}`}
          style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", borderRadius: 14, border: "none", opacity: ctaEnabled ? 1 : 0.45 }}
        >
          {ctaLabel}
        </button>
      </div>
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/outils/synthese")} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>Dossier MDPH</h1>
      </header>

      {/* Progress bar */}
      <div className="w-full" style={{ height: 3, background: "rgba(154,148,144,0.15)" }}>
        <div
          style={{
            height: "100%",
            width: `${progressPercent}%`,
            background: "linear-gradient(90deg, #E8736A, #8B74E0)",
            transition: "width 0.4s ease",
            borderRadius: "0 2px 2px 0",
          }}
        />
      </div>

      <main className="flex-1 px-4 pt-5 pb-32">
        {/* Q1 — Type de demande */}
        {showQ1 && (
          <>
            <UserBubble text="📋 Dossier MDPH" />
            <SectionSeparator text={`Dossier MDPH — ${displayName}`} />
            <AiBubble text="Pour préparer ton dossier, j'ai besoin de quelques infos que je n'ai pas dans tes mémos." />
            <AiBubble text="1 — C'est quel type de demande ?" />
            <ChipGroup chips={Q1_CHIPS} selected={q1 ? [q1] : []} onToggle={(c) => toggleSingle(c, q1, setQ1)} />
          </>
        )}

        {/* Q2 — Objectifs */}
        {showQ2 && (
          <>
            <UserBubble text={q1!} />
            <AiBubble text="2 — Quels droits souhaites-tu demander ?" />
            <ChipGroup chips={Q2_CHIPS} selected={q2} multi onToggle={(c) => toggleMulti(c, q2, setQ2)} />
            <div style={{ margin: "0 4px 14px", background: "rgba(232,115,106,0.07)", borderLeft: "2.5px solid #E8736A", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#9A9490", lineHeight: 1.55, fontStyle: "italic" }}>
                Ces informations orientent la rédaction de ton texte. The Village ne peut pas te conseiller sur tes droits — rapproche-toi d'une assistante sociale ou de la MDPH de ton département.
              </p>
            </div>
          </>
        )}

        {/* Q3 — Changements (only for Renouvellement / Évolution) */}
        {showQ3 && (
          <>
            {q2.length > 0 && <UserBubble text={q2.join(" · ")} />}
            <AiBubble text="3 — Qu'est-ce qui a changé depuis ton dernier dossier ?" />
            <ChipGroup chips={Q3_CHIPS} selected={q3Chips} multi onToggle={(c) => toggleMulti(c, q3Chips, setQ3Chips)} />
            {q3Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ3Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {showQ4 && (
          <>
            {showQ3 && q3Answer() && <UserBubble text={q3Answer()!} />}
            {!showQ3 && <UserBubble text={q2.join(" · ")} />}
            <AiBubble text="4 — Ta situation professionnelle actuelle ?" />
            <ChipGroup chips={Q4_CHIPS} selected={q4 ? [q4] : []} onToggle={(c) => toggleSingle(c, q4, setQ4)} />
            {q4 !== null && <UserBubble text={q4Answer()} />}
            {q4 !== null && (
              <>
                {q4Vocal.trim() && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
                )}
                <WiredMicOrb onTranscription={(text) => setQ4Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
              </>
            )}
            {(q4 === "Arrêt d'activité lié au handicap" || q4 === "Temps partiel lié au handicap" || q4 === "Arrêt maladie") && (
              <>
                <AiBubble text="Tu fais appel à une tierce personne rémunérée ?" />
                <ChipGroup chips={["Oui", "Non"]} selected={q4TiercePersonne === true ? ["Oui"] : q4TiercePersonne === false ? ["Non"] : []} onToggle={(c) => setQ4TiercePersonne(c === "Oui")} />
                {q4TiercePersonne === true && (
                  <>
                    <AiBubble text="Combien d'heures par semaine environ ?" />
                    <div className="flex justify-end mb-4">
                      <Input type="number" placeholder="ex : 8" value={q4HeuresTierce} onChange={(e) => setQ4HeuresTierce(e.target.value)} className="text-[14px] font-sans border-none" style={{ ...glassCard, borderRadius: 14, maxWidth: "50%", width: "50%", height: 44, textAlign: "center" }} />
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}

        {/* Q5 — Situation scolaire */}
        {showQ5 && (
          <>
            <AiBubble text={`5 — Quelle est la situation scolaire de ${displayName} ?`} />
            <ChipGroup chips={Q5_CHIPS} selected={q5 ? [q5] : []} onToggle={(c) => toggleSingle(c, q5, (v) => setQ5(v))} />
            {q5 === "🏫 Scolarisée" && q1 === "Renouvellement" && (
              <div style={{ margin: "0 4px 14px", background: "rgba(68,168,130,0.07)", borderLeft: "2.5px solid #44A882", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
                <p style={{ fontSize: 11, color: "#2a8a6a", lineHeight: 1.55 }}>
                  Pense à demander le GEVASco à l'école — ce document est attendu par la MDPH pour les renouvellements.
                </p>
              </div>
            )}
          </>
        )}

        {/* Q6 — Projet 2-3 ans */}
        {showQ6 && (
          <>
            <UserBubble text={q5Answer()} />
            <AiBubble text={`6 — Quel est ton projet pour ${displayName} dans les 2-3 prochaines années ?`} />
            <ChipGroup chips={Q6_CHIPS} selected={q6Chips} multi onToggle={(c) => toggleMulti(c, q6Chips, setQ6Chips)} />
            {q6Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ6Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q7 — Champ libre */}
         {showQ7 && (
          <>
            <UserBubble text={q6Answer()} />
            <AiBubble text="7 — Y a-t-il quelque chose d'important que je ne vois pas dans tes mémos ?" />
            {q7.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ7((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q8 — Certificat médical */}
        {showQ8 && (
          <>
            {q7.trim() ? <UserBubble text="Enregistrement ajouté ✅" /> : null}
            <AiBubble text="8 — As-tu le certificat médical sous la main ?" />
            <ChipGroup
              chips={Q8_CHIPS}
              selected={q8Etat ? [q8Etat] : []}
              onToggle={(c) => toggleSingle(c, q8Etat, setQ8Etat)}
            />
            {q8Etat === "Oui, je l'ai" && (
              <>
                <AiBubble text="Tu peux me lire ces éléments si ton médecin les a renseignés : le diagnostic principal, les restrictions fonctionnelles, les soins mentionnés, ses remarques finales." italic />
                {q8Vocal.trim() && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
                )}
                <WiredMicOrb onTranscription={(text) => setQ8Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
              </>
            )}
            {(q8Etat === "Pas encore" || q8Etat === "Certificat simplifié") && (
              <AiBubble text="Pas de problème — je génère avec tes mémos et tes réponses." italic />
            )}
          </>
        )}

        {/* Results */}
        {showResults && (
          <>
            <UserBubble text={q8Answer()} />
            <SectionSeparator text="Dossier MDPH" />

            {generatedBlocks!.map((block: any, i: number) => {
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
            })}

            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Synthèse des observations de {parentPrenom ?? "Parent"} pour {displayName} · The Village · Mars 2026
            </p>
          </>
        )}

        {showResults && (
          <div className="mb-4 px-1">
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
        )}

        <div ref={bottomRef} />
      </main>

      {!showResults && renderCta()}

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
