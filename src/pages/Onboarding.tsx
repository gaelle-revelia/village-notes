import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepEnfant } from "@/components/onboarding/StepEnfant";
import { StepVillage } from "@/components/onboarding/StepVillage";
import { StepVocabulaire } from "@/components/onboarding/StepVocabulaire";
import { StepNSM } from "@/components/onboarding/StepNSM";
import { StepReady } from "@/components/onboarding/StepReady";
import { StepMedicaments } from "@/components/onboarding/StepMedicaments";
import { StepSoins } from "@/components/onboarding/StepSoins";

const TOTAL_STEPS = 7;

const Onboarding = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [enfantId, setEnfantId] = useState<string | null>(null);
  const [prenomEnfant, setPrenomEnfant] = useState("");
  const [villageIntervenants, setVillageIntervenants] = useState<
    Array<{ nom: string; specialite: string; structure?: string }>
  >([]);
  const [saving, setSaving] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (!user) {
      setCheckingProfile(false);
      return;
    }
    supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.onboarding_completed) {
          setOnboardingDone(true);
        }
        setCheckingProfile(false);
      });
  }, [user]);

  if (loading || checkingProfile) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (onboardingDone) {
    return <Navigate to="/timeline" replace />;
  }

  const handleEnfant = async (data: { prenom: string; dateNaissance: string; diagnostic: string; prenomParent: string; sexe: string | null }) => {
    setSaving(true);
    const { data: enfant, error } = await supabase
      .from("enfants")
      .insert({
        user_id: user.id,
        prenom: data.prenom,
        date_naissance: data.dateNaissance || null,
        diagnostic_label: data.diagnostic || null,
        sexe: data.sexe || null,
      } as any)
      .select("id")
      .single();

    if (error) {
      setSaving(false);
      toast({ title: "Erreur", description: "Impossible de sauvegarder. Réessayez.", variant: "destructive" });
      return;
    }

    // Create enfant_membres entry so RLS policies work for subsequent steps
    const { error: membreError } = await supabase.from("enfant_membres").insert({
      enfant_id: enfant.id,
      user_id: user.id,
      role: "owner",
    });

    setSaving(false);

    if (membreError) {
      toast({ title: "Erreur", description: "Impossible de finaliser la configuration.", variant: "destructive" });
      return;
    }

    setEnfantId(enfant.id);
    setPrenomEnfant(data.prenom);

    // Save parent first name to profiles (non-blocking)
    if (data.prenomParent) {
      supabase.from("profiles").upsert(
        { user_id: user.id, prenom: data.prenomParent } as any,
        { onConflict: "user_id" }
      ).then(() => {});
    }

    // Generate phonetic variants for the child's first name (non-blocking)
    try {
      const { data: lexData } = await supabase.functions.invoke("generate-lexique", {
        body: { mots: [data.prenom] },
      });
      const entries = lexData?.entries;
      if (Array.isArray(entries) && entries.length > 0) {
        await supabase.from("enfant_lexique").insert(
          entries.map((e: { mot_transcrit: string }) => ({
            enfant_id: enfant.id,
            mot_transcrit: e.mot_transcrit,
            mot_correct: data.prenom,
            source: "onboarding_prenom",
          }))
        );
      }
    } catch {
      // Silent failure — continue onboarding
    }

    setStep(2);
  };

  const handleVillage = async (intervenants: { nom: string; specialite: string; structure?: string }[]) => {
    if (intervenants.length > 0 && enfantId) {
      setSaving(true);
      const { error } = await supabase.from("intervenants").insert(
        intervenants.map((i) => ({
          enfant_id: enfantId,
          nom: i.nom,
          specialite: i.specialite || null,
          structure: i.structure || null,
        }))
      );
      setSaving(false);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder les intervenants.", variant: "destructive" });
      }
    }
    setVillageIntervenants(intervenants);
    setStep(3);
  };

  const handleVocabulaire = async (
    entries: Array<{ mot_transcrit: string; mot_correct: string; source: string }>
  ) => {
    if (entries.length > 0 && enfantId) {
      setSaving(true);
      const { error } = await supabase.from("enfant_lexique").insert(
        entries.map((e) => ({
          enfant_id: enfantId,
          mot_transcrit: e.mot_transcrit,
          mot_correct: e.mot_correct,
          source: e.source || "manual",
        }))
      );
      setSaving(false);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder le vocabulaire.", variant: "destructive" });
      }
    }
    setStep(6);
  };

  const handleNSM = async (score: number) => {
    setSaving(true);
    const { error } = await supabase.from("nsm_scores").insert({
      user_id: user.id,
      score,
      context: "onboarding_j0",
    });
    setSaving(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder le score.", variant: "destructive" });
    }

    // Mark onboarding as completed
    await supabase.from("profiles").upsert(
      { user_id: user.id, onboarding_completed: true },
      { onConflict: "user_id" }
    );

    setStep(5);
  };

  return (
    <main className="flex min-h-screen flex-col px-4 py-6">
      <div className="mx-auto w-full max-w-[400px] flex-1 flex flex-col">
        {step > 1 && step < TOTAL_STEPS && (
          <button
            onClick={() => setStep(step - 1)}
            className="mb-4 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </button>
        )}
        {step < TOTAL_STEPS && (
          <div className="mb-8">
            <ProgressBar currentStep={step} totalSteps={TOTAL_STEPS} />
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center">
          {saving && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60">
              <div className="animate-pulse text-muted-foreground">Sauvegarde...</div>
            </div>
          )}

          {step === 1 && <StepEnfant onNext={handleEnfant} />}
          {step === 2 && (
            <StepVillage
              prenomEnfant={prenomEnfant}
              onNext={handleVillage}
              onSkip={() => setStep(3)}
            />
          )}
          {step === 3 && enfantId && (
            <StepVocabulaire
              prenomEnfant={prenomEnfant}
              enfantId={enfantId}
              intervenants={villageIntervenants}
              onNext={handleVocabulaire}
              onSkip={() => setStep(4)}
            />
          )}
          {step === 3 && !enfantId && (
            <div className="flex flex-col items-center justify-center gap-4 text-center">
              <p className="text-muted-foreground">Une erreur est survenue. Veuillez recommencer.</p>
              <Button
                onClick={() => { setStep(1); setEnfantId(null); setPrenomEnfant(""); }}
                className="rounded-xl"
              >
                Recommencer
              </Button>
            </div>
          )}
          {step === 4 && <StepNSM prenomEnfant={prenomEnfant} onNext={handleNSM} />}
          {step === 5 && <StepReady prenomEnfant={prenomEnfant} />}
        </div>
      </div>
    </main>
  );
};

export default Onboarding;
