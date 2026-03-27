import { useEffect, useState } from "react";
import { differenceInYears, differenceInMonths } from "date-fns";
import { Info } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
        .select("id, label, couleur, ordre, description")
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

  const handleUpdateDescription = (desc: string) => {
    if (!selectedAxeId) return;
    setAxes((prev) =>
      prev.map((a) => (a.id === selectedAxeId ? { ...a, description: desc } : a))
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
            onUpdateDescription={handleUpdateDescription}
          />
        ) : hasAxes && axes.length > 0 ? (
          /* ── Main synthèse view ── */
          <div className="flex flex-col gap-5">
            <button onClick={() => setShowHelpSheet(true)} className="flex items-center gap-1 bg-transparent border-none cursor-pointer p-0">
              <Info size={14} color="#8B74E0" />
              <span style={{ fontSize: 11, color: "#9A9490", fontFamily: "'DM Sans', sans-serif" }}>
                Comment fonctionne la constellation ?
              </span>
            </button>

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
      <Dialog open={showHelpSheet} onOpenChange={setShowHelpSheet}>
        <DialogContent
          hideClose
          className="max-w-[340px]"
          style={{
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            borderRadius: 20,
            padding: "24px 20px",
          }}
        >
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: 16, fontWeight: 600, color: "#1E1A1A", marginBottom: 12 }}>
            Comment utiliser la constellation ?
          </h3>
          <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#4A4440", lineHeight: 1.65, marginBottom: 16 }}>
            Chaque petit progrès devient une étoile. Ensemble, elles dessinent le chemin de votre enfant — pas une ligne droite, une constellation.
          </p>
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "0 0 16px" }} />
          {[
            { label: "Les axes", desc: "c'est vous qui les définissez — dans vos mots, pas le jargon médical. Ce peut être un objectif thérapeutique ou un geste du quotidien qui améliore son autonomie." },
            { label: "Les pépites", desc: "apparaissent automatiquement quand un mémo témoigne d'un lien avec un axe. Elles ne se gagnent pas — elles révèlent ce qui était déjà là." },
            { label: "La constellation", desc: "reste vivante même quand les choses ralentissent. Pas de score, pas de jugement. Juste le chemin parcouru, visible." },
          ].map((item, i) => (
            <div key={i} className="flex gap-3 items-start mb-3">
              <span style={{ color: "#8B74E0", fontSize: 13, lineHeight: "1.6", flexShrink: 0 }}>✦</span>
              <p style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, color: "#4A4440", lineHeight: 1.6, margin: 0 }}>
                <strong>{item.label}</strong> — {item.desc}
              </p>
            </div>
          ))}
          <div style={{ height: 1, background: "rgba(0,0,0,0.06)", margin: "16px 0" }} />
          <button
            onClick={() => setShowHelpSheet(false)}
            className="w-full rounded-xl py-3 font-medium"
            style={{
              background: "rgba(255,255,255,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.8)",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 14,
              color: "#1E1A1A",
              cursor: "pointer",
            }}
          >
            Compris
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SelenaScreen;
