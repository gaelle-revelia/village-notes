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
const Q5_CHIPS = ["Milieu ordinaire", "ULIS", "IME / ITEP", "Pas encore scolarisé·e"];

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
  const [currentQ, setCurrentQ] = useState(0.5);
  const [q0Lien, setQ0Lien] = useState<string | null>(null);
  const [q0Prenom, setQ0Prenom] = useState<string>("");
  const [q1, setQ1] = useState<string | null>(null);
  const [q2, setQ2] = useState<string[]>([]);
  const [q3Chips, setQ3Chips] = useState<string[]>([]);
  const [q3Vocal, setQ3Vocal] = useState("");
  const [q4, setQ4] = useState<string | null>(null);
  const [q4Vocal, setQ4Vocal] = useState("");
  const [q4TiercePersonne, setQ4TiercePersonne] = useState<boolean | null>(null);
  const [q4HeuresTierce, setQ4HeuresTierce] = useState("");
  const [q4bVocal, setQ4bVocal] = useState("");
  const [q5, setQ5] = useState<string | null>(null);
  const [q5Vocal, setQ5Vocal] = useState("");
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
  const [loadingMessage, setLoadingMessage] = useState("Préparation du dossier en cours…");
  const [generatedBlocks, setGeneratedBlocks] = useState<any[] | null>(null);
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);

  // --- Visibility rules ---
  const showQ0 = true;
  const showQ1 = currentQ >= 1;
  const showQ2 = currentQ >= 2;
  const showQ3 = currentQ >= 3 && (q1 === "Renouvellement" || q1 === "Évolution de situation");
  const showQ4 = currentQ >= 4;
  const showQ4b = currentQ >= 4.5;
  const showQ5 = currentQ >= 5;
  const showQ6 = currentQ >= 6;
  const showQ7 = currentQ >= 7;
  const showQ8 = currentQ >= 8;
  const showResults = generatedBlocks !== null;

  // --- Loading message switch ---
  useEffect(() => {
    if (isGenerating) {
      setLoadingMessage("Préparation du dossier en cours…");
      const t = setTimeout(() => {
        setLoadingMessage("Relecture et peaufinage des textes…");
      }, 7000);
      return () => clearTimeout(t);
    }
  }, [isGenerating]);

  // --- Step navigation ---
  const isCurrentStepValid = () => {
    if (currentQ === 0.5) return q0Lien !== null && q0Prenom.trim().length > 0;
    switch (currentQ) {
      case 1: return q1 !== null;
      case 2: return q2.length > 0;
      case 3: return q3Chips.length > 0 || q3Vocal.trim().length > 0;
      case 4: return q4 !== null;
      case 4.5: return q4TiercePersonne !== null;
      case 5: return q5 !== null;
      case 6: return q6Vocal.trim().length > 0;
      case 7: return true;
      case 8: return q8Etat !== null;
      default: return false;
    }
  };

  const advanceStep = () => {
    if (currentQ === 0.5) { setCurrentQ(1); return; }
    if (currentQ === 8) { handleGenerateMdph(); return; }
    let next = currentQ + 1;
    if (currentQ === 2 && !(q1 === "Renouvellement" || q1 === "Évolution de situation")) {
      next = 4;
    }
    if (currentQ === 4) next = 4.5;
    if (currentQ === 4.5) next = 5;
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
    supabase.from("profiles").select("prenom").eq("user_id", user.id).single().then(({ data }) => { if (data?.prenom) { setParentPrenom(data.prenom); setQ0Prenom(data.prenom); } });
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
  const q5Answer = () => {
    const parts: string[] = [];
    if (q5) parts.push(q5);
    if (q5Vocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.join(" · ") || "Non précisé";
  };
  const q6Answer = () => {
    if (q6Vocal.trim()) return "Enregistrement ajouté ✅";
    return null;
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
            declarant_prenom: q0Prenom.trim(),
            declarant_lien: q0Lien,
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
      if (data?.synthese_id) {
        setSyntheseId(data.synthese_id);
        navigate("/outils/synthese/mdph/resultats", {
          state: { syntheseId: data.synthese_id },
        });
      }
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
      ? (isGenerating ? loadingMessage : "Générer mon dossier →")
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



      <main className="flex-1 px-4 pt-5 pb-32">
        {/* Q0 — Déclarant */}
        {showQ0 && (
          <>
            <UserBubble text="📋 Dossier MDPH" />
            <SectionSeparator text={`Dossier MDPH — ${displayName}`} />
            <AiBubble text="Avant de commencer — qui dépose ce dossier ?" />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                La CDAPH traite une demande faite par un représentant légal. Le dossier doit être rédigé à la première personne par la personne qui signe.
              </p>
            </div>
            <div className="flex justify-end mb-3">
              <input
                type="text"
                value={q0Prenom}
                onChange={(e) => setQ0Prenom(e.target.value)}
                placeholder="Ton prénom"
                className="text-[14px] font-sans"
                style={{
                  ...glassCard,
                  borderRadius: 14,
                  padding: "10px 14px",
                  maxWidth: "60%",
                  width: "60%",
                  border: "1px solid rgba(139,116,224,0.25)",
                  outline: "none",
                  color: "#1E1A1A"
                }}
              />
            </div>
            <ChipGroup
              chips={["Mère", "Père", "Tuteur", "Autre"]}
              selected={q0Lien ? [q0Lien] : []}
              onToggle={(c) => setQ0Lien(q0Lien === c ? null : c)}
            />
          </>
        )}

        {/* Q1 — Type de demande */}
        {showQ1 && (
          <>
            {currentQ > 0.5 && q0Lien && <UserBubble text={`${q0Prenom} · ${q0Lien}`} />}
            <AiBubble text="Pour préparer ton dossier, j'ai besoin de quelques infos que je n'ai pas dans tes mémos." />
            <AiBubble text="1 — C'est quel type de demande ?" />
            <ChipGroup chips={Q1_CHIPS} selected={q1 ? [q1] : []} onToggle={(c) => toggleSingle(c, q1, setQ1)} />
          </>
        )}

        {/* Q2 — Objectifs */}
        {showQ2 && (
          <>
            {currentQ > 1 && q1 && <UserBubble text={q1} />}
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
            {currentQ > 2 && q2.length > 0 && <UserBubble text={q2.join(" · ")} />}
            <AiBubble text="3 — Qu'est-ce qui a changé depuis ton dernier dossier ?" />
            <ChipGroup chips={Q3_CHIPS} selected={q3Chips} multi onToggle={(c) => toggleMulti(c, q3Chips, setQ3Chips)} />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                N'hésite pas à détailler — date du diagnostic, type de matériel, contexte du changement…
              </p>
            </div>
            {q3Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ3Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {showQ4 && (
          <>
            {currentQ > 3 && showQ3 && q3Answer() && <UserBubble text={q3Answer()!} />}
            {currentQ > 2 && !showQ3 && q2.length > 0 && <UserBubble text={q2.join(" · ")} />}
            <AiBubble text="4 — Ta situation professionnelle actuelle ?" />
            <ChipGroup chips={Q4_CHIPS} selected={q4 ? [q4] : []} onToggle={(c) => toggleSingle(c, q4, setQ4)} />
          </>
        )}

        {/* Q4b — Tierce personne */}
        {showQ4b && (
          <>
            {currentQ > 4 && q4 && <UserBubble text={q4Answer()} />}
            <AiBubble text="Tu fais appel à une tierce personne rémunérée ? (garde, auxiliaire de vie…)" />
            <ChipGroup
              chips={["Oui", "Non"]}
              selected={q4TiercePersonne === true ? ["Oui"] : q4TiercePersonne === false ? ["Non"] : []}
              onToggle={(c) => setQ4TiercePersonne(c === "Oui")}
            />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                Précise à l'oral : qui intervient, combien d'heures par semaine, le coût mensuel environ…
              </p>
            </div>
            {q4bVocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb
              onTranscription={(text) => setQ4bVocal((prev) => prev ? prev + " " + text : text)}
              onRecordingChange={setIsRecording}
            />
          </>
        )}

        {/* Q5 — Situation scolaire */}
        {showQ5 && (
          <>
            <AiBubble text={`5 — Quelle est la situation scolaire actuelle de ${displayName} ?`} />
            <ChipGroup chips={Q5_CHIPS} selected={q5 ? [q5] : []} onToggle={(c) => toggleSingle(c, q5, (v) => setQ5(v))} />
            {q5 === "Milieu ordinaire" && q1 === "Renouvellement" && (
              <div style={{ margin: "0 4px 14px", background: "rgba(68,168,130,0.07)", borderLeft: "2.5px solid #44A882", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
                <p style={{ fontSize: 11, color: "#2a8a6a", lineHeight: 1.55 }}>
                  Pense à demander le GEVASco à l'école — ce document est attendu par la MDPH pour les renouvellements.
                </p>
              </div>
            )}
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                Coche la situation aujourd'hui — si une orientation est en cours ou prévue, précise-le à l'oral.
              </p>
            </div>
            {q5Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ5Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q6 — Projet 2-3 ans */}
        {showQ6 && (
          <>
            {currentQ > 5 && q5 && <UserBubble text={q5Answer()} />}
            <AiBubble text={`6 — Quel est ton projet pour ${displayName} dans les 2-3 prochaines années ?`} />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                Précise à l'oral : dispositifs visés (SESSAD, AESH…), fréquence souhaitée, projet scolaire, objectif thérapeutique, horizon de temps…
              </p>
            </div>
            {q6Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ6Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q7 — Champ libre */}
         {showQ7 && (
          <>
            {currentQ > 6 && q6Answer() && <UserBubble text={q6Answer()!} />}
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
            {currentQ > 7 && q7.trim() && <UserBubble text="Enregistrement ajouté ✅" />}
            <AiBubble text="8 — As-tu le certificat médical sous la main ?" />
            <ChipGroup
              chips={Q8_CHIPS}
              selected={q8Etat ? [q8Etat] : []}
              onToggle={(c) => toggleSingle(c, q8Etat, setQ8Etat)}
            />
            {q8Etat === "Oui, je l'ai" && (
              <>
                <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
                  <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                    Le diagnostic principal, les restrictions fonctionnelles, les soins mentionnés, les remarques finales — lis directement ou reformule avec tes mots, pour que le dossier généré soit cohérent avec ce que le médecin a écrit.
                  </p>
                </div>
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

      {renderCta()}

      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseMdph;
