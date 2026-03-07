import { useEffect, useState } from "react";
import { differenceInYears, differenceInMonths } from "date-fns";
import { HelpCircle } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { useEnfantPrenom } from "@/hooks/useEnfantPrenom";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import CarteProgressionOnboarding from "@/components/progression/CarteProgressionOnboarding";
import AxeCard from "@/components/progression/AxeCard";
import AxeDetail, { type PepiteDetail } from "@/components/progression/AxeDetail";

interface Axe {
  id: string;
  label: string;
  couleur: string;
  ordre: number;
  description: string | null;
}

interface PepiteWithDate {
  id: string;
  created_at: string;
}

interface PepiteRich extends PepiteWithDate {
  memo_id: string;
  resume: string | null;
  type: string;
}

function computeAge(dateNaissance: string): string | null {
  const birth = new Date(dateNaissance);
  const now = new Date();
  const years = differenceInYears(now, birth);
  const totalMonths = differenceInMonths(now, birth);
  const months = totalMonths % 12;
  if (years >= 1) {
    return months > 0 ? `${years} an${years > 1 ? "s" : ""} et ${months} mois` : `${years} an${years > 1 ? "s" : ""}`;
  }
  return totalMonths > 0 ? `${totalMonths} mois` : null;
}

const SelenaScreen = () => {
  const prenom = useEnfantPrenom();
  const { enfantId } = useEnfantId();
  const [showCarteOnboarding, setShowCarteOnboarding] = useState(false);
  const [checkingAxes, setCheckingAxes] = useState(true);
  const [dateNaissance, setDateNaissance] = useState<string | null>(null);
  const [axes, setAxes] = useState<Axe[]>([]);
  const [pepitesByAxe, setPepitesByAxe] = useState<Record<string, PepiteWithDate[]>>({});
  const [pepitesRichByAxe, setPepitesRichByAxe] = useState<Record<string, PepiteRich[]>>({});
  const [selectedAxeId, setSelectedAxeId] = useState<string | null>(null);
  const [showHelpSheet, setShowHelpSheet] = useState(false);

  // Check if axes exist + fetch date_naissance
  useEffect(() => {
    if (!enfantId) return;

    const fetchInitial = async () => {
      const [axesRes, enfantRes] = await Promise.all([
        supabase
          .from("axes_developpement")
          .select("id", { count: "exact", head: true })
          .eq("enfant_id", enfantId)
          .eq("actif", true),
        supabase
          .from("enfants")
          .select("date_naissance")
          .eq("id", enfantId)
          .single(),
      ]);

      if (axesRes.count === 0) setShowCarteOnboarding(true);
      if (enfantRes.data?.date_naissance) setDateNaissance(enfantRes.data.date_naissance);
      setCheckingAxes(false);
    };

    fetchInitial();
  }, [enfantId]);

  const hasAxes = !checkingAxes && !showCarteOnboarding;

  // Fetch full axes + pepites when hasAxes
  useEffect(() => {
    if (!hasAxes || !enfantId) return;

    const fetchAxesData = async () => {
      const { data: axesData } = await supabase
        .from("axes_developpement")
        .select("id, label, couleur, ordre")
        .eq("enfant_id", enfantId)
        .eq("actif", true)
        .order("ordre", { ascending: true });

      if (!axesData || axesData.length === 0) return;
      setAxes(axesData);

      // Fetch pepites with memo resume and type
      const axeIds = axesData.map((a) => a.id);
      const { data: pepitesData } = await supabase
        .from("pepites")
        .select("id, axe_id, memo_id, created_at, memos(created_at, content_structured, type)")
        .in("axe_id", axeIds);

      const grouped: Record<string, PepiteWithDate[]> = {};
      const groupedRich: Record<string, PepiteRich[]> = {};
      for (const ax of axesData) {
        grouped[ax.id] = [];
        groupedRich[ax.id] = [];
      }

      if (pepitesData) {
        for (const p of pepitesData as any[]) {
          const createdAt = p.memos?.created_at || p.created_at;
          const resume =
            p.memos?.content_structured?.resume || null;
          const memoType = p.memos?.type || "vocal";

          if (grouped[p.axe_id]) {
            grouped[p.axe_id].push({ id: p.id, created_at: createdAt });
            groupedRich[p.axe_id].push({
              id: p.id,
              created_at: createdAt,
              memo_id: p.memo_id,
              resume,
              type: memoType,
            });
          }
        }
      }

      setPepitesByAxe(grouped);
      setPepitesRichByAxe(groupedRich);
    };

    fetchAxesData();
  }, [hasAxes, enfantId]);

  const age = dateNaissance ? computeAge(dateNaissance) : null;

  const selectedAxe = selectedAxeId ? axes.find((a) => a.id === selectedAxeId) : null;

  const handleRemovePepite = (pepiteId: string) => {
    if (!selectedAxeId) return;
    setPepitesRichByAxe((prev) => ({
      ...prev,
      [selectedAxeId]: prev[selectedAxeId]?.filter((p) => p.id !== pepiteId) || [],
    }));
    setPepitesByAxe((prev) => ({
      ...prev,
      [selectedAxeId]: prev[selectedAxeId]?.filter((p) => p.id !== pepiteId) || [],
    }));
  };

  const handleArchiveAxe = () => {
    setAxes((prev) => prev.filter((a) => a.id !== selectedAxeId));
    setSelectedAxeId(null);
  };

  const handleRenameAxe = (newLabel: string) => {
    setAxes((prev) =>
      prev.map((a) => (a.id === selectedAxeId ? { ...a, label: newLabel } : a))
    );
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-10 px-4 py-3 flex items-center justify-between"
        style={{
          backdropFilter: "blur(20px) saturate(1.5)",
          WebkitBackdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: 30,
            fontWeight: 700,
            color: "#1E1A1A",
            letterSpacing: -0.5,
          }}
        >
          {prenom || "Enfant"}
        </h1>
        <ProfileAvatar />
      </header>

      <main className="flex-1 px-4 pb-24 pt-5">
        {hasAxes && axes.length > 0 && selectedAxe && selectedAxeId ? (
          /* ── Axe detail view ── */
          <AxeDetail
            axe={selectedAxe}
            pepites={pepitesRichByAxe[selectedAxeId] || []}
            prenom={prenom || "Enfant"}
            onBack={() => setSelectedAxeId(null)}
            onRemovePepite={handleRemovePepite}
            onArchiveAxe={handleArchiveAxe}
            onRenameAxe={handleRenameAxe}
          />
        ) : hasAxes && axes.length > 0 ? (
          /* ── Main synthèse view ── */
          <div className="flex flex-col gap-5">
            {/* Badge row */}
            <div className="flex items-center justify-between w-full">
              <span
                style={{
                  background: "rgba(139,116,224,0.12)",
                  color: "#8B74E0",
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  textTransform: "uppercase",
                  borderRadius: 20,
                  padding: "4px 10px",
                  fontWeight: 600,
                  letterSpacing: 0.5,
                }}
              >
                ✦ Carte de Progression
              </span>
              <button
                onClick={() => setShowHelpSheet(true)}
                className="p-1"
                aria-label="Aide"
              >
                <HelpCircle size={18} color="#9A9490" />
              </button>
            </div>

            {/* Intro text */}
            <p
              className="text-center"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: "#9A9490",
                fontStyle: "italic",
                lineHeight: 1.6,
                padding: "0 24px",
              }}
            >
              Chaque mémo témoignant d'un progrès, même petit, devient une étoile. Ensemble, elles dessinent le chemin de {prenom} — pas une ligne droite, une constellation.
            </p>

            {/* Section header */}
            <div className="flex items-center justify-between mt-1">
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 10,
                  textTransform: "uppercase",
                  color: "#9A9490",
                  fontWeight: 500,
                  letterSpacing: 0.8,
                }}
              >
                AXES ACTIFS
              </span>
              <span
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 11,
                  color: "#8B74E0",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                Archives
              </span>
            </div>

            {/* Axes list */}
            <div className="flex flex-col gap-3">
              {axes.map((axe) => (
                <AxeCard
                  key={axe.id}
                  axe={axe}
                  pepites={pepitesByAxe[axe.id] || []}
                  onClick={(id) => setSelectedAxeId(id)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </main>

      <BottomNavBar />

      {!checkingAxes && showCarteOnboarding && enfantId && prenom && (
        <CarteProgressionOnboarding
          enfantId={enfantId}
          prenom={prenom}
          onComplete={() => setShowCarteOnboarding(false)}
        />
      )}

      {/* Pedagogical help sheet */}
      <Sheet open={showHelpSheet} onOpenChange={setShowHelpSheet}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-6 pb-8 pt-3"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
          }}
        >
          {/* Handle bar */}
          <div className="flex justify-center mb-5">
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "#E0E0E0" }} />
          </div>
          <SheetTitle
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: 18,
              fontWeight: 600,
              color: "#1E1A1A",
              marginBottom: 16,
            }}
          >
            Comment ça marche ?
          </SheetTitle>
          <div className="flex flex-col gap-4">
            {[
              "Chaque mémo que tu notes est analysé et associé à un axe si le lien est évident.",
              "Les axes sont dans tes mots — jamais du jargon médical.",
              "Pas de score, pas de jugement. Juste le chemin parcouru, visible.",
            ].map((text, i) => (
              <div key={i} className="flex gap-3 items-start">
                <span style={{ color: "#8B74E0", fontSize: 13, lineHeight: "1.6", flexShrink: 0 }}>✦</span>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13.5,
                    color: "#1E1A1A",
                    lineHeight: 1.6,
                  }}
                >
                  {text}
                </p>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default SelenaScreen;
