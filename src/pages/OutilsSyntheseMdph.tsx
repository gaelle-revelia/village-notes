import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import WiredMicOrb from "@/components/synthese/WiredMicOrb";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
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
  const [q2Vocal, setQ2Vocal] = useState("");
  const [q3Vocal, setQ3Vocal] = useState("");
  const [q4Scolarite, setQ4Scolarite] = useState<string | null>(null);
  const [q4ScolariteVocal, setQ4ScolariteVocal] = useState("");
  const [q5Vocal, setQ5Vocal] = useState("");
  const [q6Libre, setQ6Libre] = useState("");
  
  const [q7Etat, setQ7Etat] = useState<string | null>(null);
  const [q7Vocal, setQ7Vocal] = useState("");

  const [memoCount, setMemoCount] = useState<number | null>(null);
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Préparation du dossier en cours…");
  const [syntheseId, setSyntheseId] = useState<string | null>(null);
  const [introSeen, setIntroSeen] = useState(false);
  const [showIntroBubble2, setShowIntroBubble2] = useState(false);

  // --- Visibility rules ---
  const showQ0 = true;
  const showQ1 = currentQ >= 1;
  const showQ2 = currentQ >= 2;
  const showQ3 = currentQ >= 3;
  const showQ4 = currentQ >= 4;
  const showQ5 = currentQ >= 5;
  const showQ6 = currentQ >= 6;
  const showQ7 = currentQ >= 7;
  

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

  useEffect(() => {
    if (!introSeen) {
      const t = setTimeout(() => setShowIntroBubble2(true), 1500);
      return () => clearTimeout(t);
    }
  }, [introSeen]);

  // --- Step navigation ---
  const isCurrentStepValid = () => {
    if (currentQ === 0.5) return q0Lien !== null && q0Prenom.trim().length > 0;
    switch (currentQ) {
      case 1: return q1 !== null;
      case 2: return q2Vocal.trim().length > 0;
      case 3: return q3Vocal.trim().length > 0;
      case 4: return q4Scolarite !== null;
      case 5: return q5Vocal.trim().length > 0;
      case 6: return true; // optionnel
      case 7: return q7Etat !== null;
      default: return false;
    }
  };

  const advanceStep = () => {
    if (currentQ === 0.5) { setCurrentQ(1); return; }
    if (currentQ === 7) { handleGenerateMdph(); return; }
    setCurrentQ(prev => prev + 1);
  };

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
  }, [currentQ, introSeen]);

  useEffect(() => {
    if (q2Vocal.trim()) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q2Vocal]);

  useEffect(() => {
    if (q3Vocal.trim()) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q3Vocal]);

  useEffect(() => {
    if (q5Vocal.trim()) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q5Vocal]);

  useEffect(() => {
    if (q6Libre.trim()) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q6Libre]);

  useEffect(() => {
    if (q7Vocal.trim()) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q7Vocal]);

  useEffect(() => {
    if (q7Etat) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [q7Etat]);

  const toggleSingle = (val: string, current: string | null, setter: (v: string | null) => void) => {
    setter(current === val ? null : val);
  };

  const toggleMulti = (val: string, current: string[], setter: (v: string[]) => void) => {
    setter(current.includes(val) ? current.filter((c) => c !== val) : [...current, val]);
  };

  // Answer text helpers
  const q2Answer = () => {
    if (q2Vocal.trim()) return "Enregistrement ajouté ✅";
    return null;
  };
  const q3Answer = () => {
    if (q3Vocal.trim()) return "Enregistrement ajouté ✅";
    return null;
  };
  const q4Answer = () => {
    const parts: string[] = [];
    if (q4Scolarite) parts.push(q4Scolarite);
    if (q4ScolariteVocal.trim()) parts.push("Enregistrement ajouté ✅");
    return parts.join(" · ") || "Non précisé";
  };
  const q5Answer = () => {
    if (q5Vocal.trim()) return "Enregistrement ajouté ✅";
    return null;
  };
  const q6Answer = () => {
    if (q6Libre.trim()) return "Enregistrement ajouté ✅";
    return null;
  };
  const q7Answer = () => {
    const parts: string[] = [];
    if (q7Etat) parts.push(q7Etat);
    if (q7Etat === "Oui, je l'ai" && q7Vocal.trim()) parts.push("Enregistrement ajouté ✅");
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
            type_demande: q1,
            vie_quotidienne: q2Vocal.trim() || null,
            organisation_soins: q3Vocal.trim() || null,
            scolarisation: q4Scolarite,
            scolarisation_details: q4ScolariteVocal.trim() || null,
            projet: q5Vocal.trim() || null,
            champ_libre: q6Libre.trim() || null,
            certificat_etat: q7Etat,
            certificat_vocal: q7Vocal.trim() || null,
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
    if (!introSeen) {
      return (
         <div style={{ position: "sticky", bottom: 0, padding: "6px 16px 76px" }}>
          <button
            onClick={() => setIntroSeen(true)}
            style={{ width: "100%", padding: "11px 15px", background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", border: "none", borderRadius: 16, fontSize: 15, fontWeight: 600, cursor: "pointer" }}>
            On démarre →
          </button>
        </div>
      );
    }

    const ctaEnabled = isCurrentStepValid() && !isGenerating && !isRecording;
    const ctaLabel = currentQ === 7
      ? (isGenerating ? loadingMessage : "Générer mon dossier →")
      : "Continuer →";

    return (
      <div style={{ position: "sticky", bottom: 0, padding: "6px 16px 76px" }}>
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



      <main className="flex-1 px-4 pt-5 pb-24">
        {/* Intro message */}
        {!introSeen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #E8736A, #8B74E0)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                </svg>
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 500, color: "#8B74E0", marginBottom: 3 }}>The Village</p>
                <div style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "4px 16px 16px 16px", padding: "12px 14px", maxWidth: 260 }}>
                  <p style={{ fontSize: 13.5, color: "#1E1A1A", lineHeight: 1.6, margin: 0 }}>
                    The Village, c'est la mémoire vivante du quotidien de {displayName} et de votre famille. Je retranscris l'impact du handicap sur votre vie de tous les jours — à partir de ce que vous m'avez confié au fil du temps. Mon rôle s'arrête là : mettre en mots votre réalité pour que le dossier parle pour vous. Pour tout ce qui touche à vos droits, rapprochez-vous de la MDPH ou d'une assistante sociale.
                  </p>
                </div>
              </div>
            </div>
            {showIntroBubble2 && (
              <div style={{ display: "flex", gap: 10, paddingLeft: 46 }}>
                <div style={{ background: "rgba(255,255,255,0.58)", border: "1px solid rgba(255,255,255,0.9)", borderRadius: "4px 16px 16px 16px", padding: "12px 14px", maxWidth: 260 }}>
                  <p style={{ fontSize: 13.5, color: "#1E1A1A", lineHeight: 1.6, margin: 0 }}>
                    Je vais vous poser quelques questions — sur le quotidien de {displayName}, votre organisation, sa scolarité et son projet. Répondez à l'oral, prenez le temps qu'il vous faut. À la fin, je génère les textes à coller dans votre formulaire CERFA.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Q0 — Déclarant */}
        {introSeen && showQ0 && (
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
        {introSeen && showQ1 && (
          <>
            {currentQ > 0.5 && q0Lien && <UserBubble text={`${q0Prenom} · ${q0Lien}`} />}
            <AiBubble text="Pour préparer ton dossier, j'ai besoin de quelques infos que je n'ai pas dans tes mémos." />
            <AiBubble text="1 — C'est quel type de demande ?" />
            <ChipGroup chips={Q1_CHIPS} selected={q1 ? [q1] : []} onToggle={(c) => toggleSingle(c, q1, setQ1)} />
          </>
        )}

        {/* Q2 — Vie quotidienne */}
        {introSeen && showQ2 && (
          <>
            {currentQ > 1 && q1 && (
              <UserBubble text={q1} />
            )}
            <AiBubble text={`2 — Comment se passe le quotidien de ${displayName} ?`} />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.6, margin: 0 }}>
                C'est la partie la plus importante du dossier. Décris une journée type — le réveil, les repas, le bain, les déplacements, ce qui est impossible sans aide. Plus tu détailles, plus le dossier sera fort. Prends le temps qu'il te faut.
              </p>
            </div>
            {q2Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb
              onTranscription={(text) => setQ2Vocal(prev => prev ? prev + " " + text : text)}
              onRecordingChange={setIsRecording}
            />
          </>
        )}

        {/* Q3 — Organisation soins */}
        {introSeen && showQ3 && (
          <>
            {currentQ > 2 && q2Vocal.trim() && (
              <UserBubble text="Enregistrement ajouté ✅" />
            )}
            <AiBubble text="3 — Comment tu t'organises pour les soins et les rendez-vous ?" />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.6, margin: 0 }}>
                La commission a besoin de comprendre ton organisation — les rendez-vous hebdomadaires, les soins à domicile, les exercices de rééducation, l'aide rémunérée si tu en as une. Ta situation professionnelle aussi : est-ce que les soins ont impacté ton activité ?
              </p>
            </div>
            {q3Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>
                ✓ Enregistrement capté
              </p>
            )}
            <WiredMicOrb
              onTranscription={(text) => setQ3Vocal(prev => prev ? prev + " " + text : text)}
              onRecordingChange={setIsRecording}
            />
          </>
        )}

        {/* Q4 — Situation scolaire */}
        {introSeen && showQ4 && (
          <>
            {currentQ > 3 && q3Vocal.trim() && (
              <UserBubble text="Enregistrement ajouté ✅" />
            )}
            <AiBubble text={`4 — Quelle est la situation scolaire actuelle de ${displayName} ?`} />
            <ChipGroup chips={Q5_CHIPS} selected={q4Scolarite ? [q4Scolarite] : []} onToggle={(c) => toggleSingle(c, q4Scolarite, setQ4Scolarite)} />
            {q4Scolarite === "Milieu ordinaire" && q1 === "Renouvellement" && (
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
            {q4ScolariteVocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ4ScolariteVocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q5 — Projet 2-3 ans */}
        {introSeen && showQ5 && (
          <>
            {currentQ > 4 && q4Scolarite && (
              <UserBubble text={q4Answer()} />
            )}
            <AiBubble text={`5 — Quel est le projet pour ${displayName} dans les 2-3 prochaines années ?`} />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                Précise à l'oral : dispositifs visés (SESSAD, AESH…), fréquence souhaitée, projet scolaire, objectif thérapeutique, horizon de temps…
              </p>
            </div>
            {q5Vocal.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ5Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q6 — Champ libre */}
        {introSeen && showQ6 && (
          <>
            {currentQ > 5 && q5Vocal.trim() && (
              <UserBubble text="Enregistrement ajouté ✅" />
            )}
            <AiBubble text="6 — Y a-t-il quelque chose d'important que je ne vois pas dans tes mémos ?" />
            <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
              <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.6, margin: 0 }}>
                Si tu as quelque chose d'important à ajouter qui n'est pas encore dans tes mémos, c'est le moment.
              </p>
            </div>
            {q6Libre.trim() && (
              <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
            )}
            <WiredMicOrb onTranscription={(text) => setQ6Libre((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
          </>
        )}

        {/* Q7 — Certificat médical */}
        {introSeen && showQ7 && (
          <>
            {currentQ > 6 && q6Libre.trim() && (
              <UserBubble text="Enregistrement ajouté ✅" />
            )}
            <AiBubble text="7 — As-tu le certificat médical sous la main ?" />
            <ChipGroup
              chips={Q8_CHIPS}
              selected={q7Etat ? [q7Etat] : []}
              onToggle={(c) => toggleSingle(c, q7Etat, setQ7Etat)}
            />
            {q7Etat === "Oui, je l'ai" && (
              <>
                <div style={{ margin: "0 4px 12px", background: "rgba(139,116,224,0.07)", borderLeft: "2.5px solid #8B74E0", borderRadius: "0 10px 10px 0", padding: "9px 13px" }}>
                  <p style={{ fontSize: 11, color: "#8B74E0", lineHeight: 1.55 }}>
                    Le diagnostic principal, les restrictions fonctionnelles, les soins mentionnés, les remarques finales — lis directement ou reformule avec tes mots, pour que le dossier généré soit cohérent avec ce que le médecin a écrit.
                  </p>
                </div>
                {q7Vocal.trim() && (
                  <p style={{ textAlign: "center", fontSize: 12, color: "#44A882", margin: "4px 0 8px" }}>✓ Enregistrement capté</p>
                )}
                <WiredMicOrb onTranscription={(text) => setQ7Vocal((prev) => prev ? prev + " " + text : text)} onRecordingChange={setIsRecording} />
              </>
            )}
            {(q7Etat === "Pas encore" || q7Etat === "Certificat simplifié") && (
              <AiBubble text="Pas de problème — je génère avec tes mémos et tes réponses." italic />
            )}
          </>
        )}



        <div ref={bottomRef} />
      </main>

      {renderCta()}

      <BottomNavBar />
    </div>
  );
};

export default OutilsSyntheseMdph;
