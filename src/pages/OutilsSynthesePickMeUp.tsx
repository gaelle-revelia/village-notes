import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Mic, Copy, Share2, Pencil, RefreshCw, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import BottomNavBar from "@/components/BottomNavBar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow:
    "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const EMOTIONS = [
  "Je suis épuisée",
  "Je suis découragée",
  "Je doute que ça avance",
  "J'ai besoin de me rappeler pourquoi je fais tout ça",
];

const PERIODS = [
  "Ce mois-ci",
  "3 derniers mois",
  "6 derniers mois",
  "Depuis le début",
];

const AiBubble = ({ text }: { text: string }) => (
  <div className="flex items-start gap-3 mb-5">
    <div
      className="flex-shrink-0 flex items-center justify-center"
      style={{
        width: 36,
        height: 36,
        borderRadius: "50%",
        background: "linear-gradient(135deg, #E8736A, #8B74E0)",
      }}
    >
      <span className="text-[16px] leading-none">✨</span>
    </div>
    <div className="flex-1 min-w-0">
      <span
        className="block mb-1 font-sans font-medium"
        style={{ color: "#8B74E0", fontSize: 10 }}
      >
        The Village
      </span>
      <div
        className="px-4 py-3 inline-block"
        style={{
          ...glassCard,
          background: "rgba(139,116,224,0.07)",
          border: "1px solid rgba(139,116,224,0.18)",
          maxWidth: "92%",
        }}
      >
        <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
          {text}
        </p>
      </div>
    </div>
  </div>
);

const UserBubble = ({ text }: { text: string }) => (
  <div className="flex justify-end mb-4">
    <div
      className="px-4 py-3 inline-block max-w-[80%]"
      style={{
        ...glassCard,
        background: "rgba(139,116,224,0.13)",
        border: "1px solid rgba(139,116,224,0.25)",
      }}
    >
      <p className="text-[14px] font-sans leading-snug" style={{ color: "#1E1A1A" }}>
        {text}
      </p>
    </div>
  </div>
);

const OutilsSynthesePickMeUp = () => {
  const navigate = useNavigate();
  const prenom = useEnfantPrenom();
  const { user } = useAuth();
  const { toast } = useToast();
  const displayName = prenom ?? "votre enfant";

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [dateStart, setDateStart] = useState<Date | undefined>();
  const [dateEnd, setDateEnd] = useState<Date | undefined>();
  const [parentPrenom, setParentPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("prenom")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.prenom) setParentPrenom(data.prenom);
      });
  }, [user]);

  const emotionText = selectedEmotion || freeText.trim();
  const hasEmotion = emotionText.length > 0;

  const periodText = selectedPeriod
    ? selectedPeriod
    : dateStart && dateEnd
      ? `Du ${format(dateStart, "d MMM yyyy", { locale: fr })} au ${format(dateEnd, "d MMM yyyy", { locale: fr })}`
      : null;
  const hasPeriod = !!periodText;

  const headerTitle =
    step === 1 ? "Pick-me-up" : step === 2 ? "Période" : "Ton remontant";

  const handleBack = () => {
    if (step === 3) setStep(2);
    else if (step === 2) setStep(1);
    else navigate("/outils/synthese");
  };

  const mockedContent = `Ces derniers mois, ${displayName} a fait des pas incroyables. Là où certains gestes semblaient impossibles, ils sont devenus naturels. Les professionnels qui l'accompagnent remarquent une vraie ouverture, une curiosité nouvelle. Ce n'est pas un hasard — c'est le fruit de ta présence, de ta patience, de chaque rendez-vous honoré, de chaque exercice répété à la maison. ${displayName} avance, et c'est aussi grâce à toi.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(mockedContent);
      toast({ title: "Copié dans le presse-papier ✅" });
    } catch {
      toast({ title: "Impossible de copier", variant: "destructive" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
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
        <button onClick={handleBack} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <h1 className="text-xl font-serif font-semibold" style={{ color: "#1E1A1A" }}>
          {headerTitle}
        </h1>
      </header>

      {/* STEP 1 */}
      {step === 1 && (
        <main className="flex-1 px-4 pt-5 pb-24">
          <AiBubble text="Comment tu te sens en ce moment ? (Ta réponse m'aide à trouver le bon angle)" />

          {/* Chips — 2×2 grid */}
          <div className="grid grid-cols-2 gap-2 ml-12 mb-4" style={{ maxWidth: "92%" }}>
            {EMOTIONS.map((e) => (
              <button
                key={e}
                onClick={() => {
                  setSelectedEmotion(selectedEmotion === e ? null : e);
                  setFreeText("");
                }}
                className="px-3 py-2.5 text-left text-[13px] font-sans transition-all w-fit"
                style={{
                  ...(selectedEmotion === e
                    ? { background: "#8B74E0", color: "#fff", borderRadius: 14, border: "none" }
                    : { ...glassCard, borderRadius: 14 }),
                }}
              >
                {e}
              </button>
            ))}
          </div>

          {/* User bubble — after chips */}
          {hasEmotion && <UserBubble text={emotionText} />}

          {/* Mic orb */}
          <div className="flex flex-col items-center gap-3 mb-4">
            <div
              className="flex items-center justify-center"
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                cursor: "not-allowed",
              }}
            >
              <Mic size={28} color="#fff" />
            </div>
            <span className="text-[13px] font-sans" style={{ color: "#9A9490" }}>
              ou
            </span>
          </div>

          {/* CTA */}
          <button
            disabled={!hasEmotion}
            onClick={() => setStep(2)}
            className="w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              color: "#fff",
              borderRadius: 14,
              border: "none",
              opacity: hasEmotion ? 1 : 0.4,
              cursor: hasEmotion ? "pointer" : "not-allowed",
            }}
          >
            Choisir la période →
          </button>
        </main>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <main className="flex-1 px-4 pt-5 pb-24">
          <AiBubble text="Sur quelle période tu veux qu'on regarde ?" />

          {/* Period chips */}
          <div className="flex flex-col gap-2 ml-12 mb-6">
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setSelectedPeriod(selectedPeriod === p ? null : p);
                  setDateStart(undefined);
                  setDateEnd(undefined);
                }}
                className="px-4 py-2.5 text-left text-[14px] font-sans transition-all"
                style={{
                  ...(selectedPeriod === p
                    ? { background: "#8B74E0", color: "#fff", borderRadius: 14, border: "none" }
                    : { ...glassCard, borderRadius: 14 }),
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* Custom date range */}
          <div className="ml-12 mb-5">
            <span className="block text-[12px] font-sans mb-2" style={{ color: "#9A9490" }}>
              Ou choisis une période personnalisée
            </span>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("flex-1 justify-start text-left text-[13px] font-normal", !dateStart && "text-muted-foreground")}
                    style={{ borderRadius: 12 }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateStart ? format(dateStart, "d MMM yyyy", { locale: fr }) : "Début"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateStart}
                    onSelect={(d) => { setDateStart(d || undefined); setSelectedPeriod(null); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("flex-1 justify-start text-left text-[13px] font-normal", !dateEnd && "text-muted-foreground")}
                    style={{ borderRadius: 12 }}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateEnd ? format(dateEnd, "d MMM yyyy", { locale: fr }) : "Fin"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateEnd}
                    onSelect={(d) => { setDateEnd(d || undefined); setSelectedPeriod(null); }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* User bubble */}
          {hasPeriod && <UserBubble text={periodText!} />}

          {/* CTA */}
          <button
            disabled={!hasPeriod}
            onClick={() => setStep(3)}
            className="w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity"
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              color: "#fff",
              borderRadius: 14,
              border: "none",
              opacity: hasPeriod ? 1 : 0.4,
              cursor: hasPeriod ? "pointer" : "not-allowed",
            }}
          >
            Générer mon remontant →
          </button>
        </main>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <main className="flex-1 px-4 pt-5 pb-32">
          <h2
            className="text-2xl font-serif font-semibold mb-5"
            style={{ color: "#1E1A1A" }}
          >
            Ton remontant
          </h2>

          <div className="px-5 py-4 mb-6" style={{ ...glassCard }}>
            <p className="text-[14px] font-sans leading-relaxed" style={{ color: "#1E1A1A" }}>
              {mockedContent}
            </p>
          </div>

          <p className="text-center text-[10px] font-sans" style={{ color: "#9A9490" }}>
            Synthèse des observations de {parentPrenom ?? "Parent"} pour {displayName} · The Village · Mars 2026
          </p>

          {/* Action bar */}
          <div
            className="fixed bottom-16 left-0 right-0 z-10 px-4 py-3 flex items-center justify-around"
            style={{
              background: "rgba(255,255,255,0.72)",
              backdropFilter: "blur(20px) saturate(1.5)",
              WebkitBackdropFilter: "blur(20px) saturate(1.5)",
              borderTop: "1px solid rgba(255,255,255,0.6)",
              boxShadow: "0 -2px 12px rgba(0,0,0,0.05)",
            }}
          >
            {[
              { icon: Copy, label: "Copier", action: handleCopy },
              { icon: Share2, label: "Partager", action: () => {} },
              { icon: Pencil, label: "Modifier", action: () => {} },
              { icon: RefreshCw, label: "Régénérer", action: () => {} },
            ].map(({ icon: Icon, label, action }) => (
              <button
                key={label}
                onClick={action}
                className="flex flex-col items-center gap-1 text-[11px] font-sans"
                style={{ color: "#1E1A1A" }}
              >
                <Icon size={18} />
                {label}
              </button>
            ))}
          </div>
        </main>
      )}

      <BottomNavBar />
    </div>
  );
};

export default OutilsSynthesePickMeUp;
