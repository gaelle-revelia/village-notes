import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ProgressBar } from "@/components/onboarding/ProgressBar";
import { StepEnfant } from "@/components/onboarding/StepEnfant";
import { StepVillage } from "@/components/onboarding/StepVillage";
import { StepNSM } from "@/components/onboarding/StepNSM";
import { StepReady } from "@/components/onboarding/StepReady";

const Onboarding = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [enfantId, setEnfantId] = useState<string | null>(null);
  const [prenomEnfant, setPrenomEnfant] = useState("");
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const handleEnfant = async (data: { prenom: string; dateNaissance: string; diagnostic: string }) => {
    setSaving(true);
    const { data: enfant, error } = await supabase
      .from("enfants")
      .insert({
        user_id: user.id,
        prenom: data.prenom,
        date_naissance: data.dateNaissance || null,
        diagnostic_label: data.diagnostic || null,
      })
      .select("id")
      .single();

    setSaving(false);

    if (error) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder. Réessayez.", variant: "destructive" });
      return;
    }

    setEnfantId(enfant.id);
    setPrenomEnfant(data.prenom);
    setStep(2);
  };

  const handleVillage = async (intervenants: { nom: string; specialite: string }[]) => {
    if (intervenants.length > 0 && enfantId) {
      setSaving(true);
      const { error } = await supabase.from("intervenants").insert(
        intervenants.map((i) => ({
          enfant_id: enfantId,
          nom: i.nom,
          specialite: i.specialite || null,
        }))
      );
      setSaving(false);

      if (error) {
        toast({ title: "Erreur", description: "Impossible de sauvegarder les intervenants.", variant: "destructive" });
        return;
      }
    }
    setStep(3);
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
      return;
    }
    setStep(4);
  };

  return (
    <main className="flex min-h-screen flex-col bg-background px-4 py-6">
      <div className="mx-auto w-full max-w-[400px] flex-1 flex flex-col">
        {step > 1 && step < 4 && (
          <button
            onClick={() => setStep(step - 1)}
            className="mb-4 self-start text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Retour
          </button>
        )}
        {step < 4 && (
          <div className="mb-8">
            <ProgressBar currentStep={step} totalSteps={4} />
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
          {step === 3 && <StepNSM prenomEnfant={prenomEnfant} onNext={handleNSM} />}
          {step === 4 && <StepReady prenomEnfant={prenomEnfant} />}
        </div>
      </div>
    </main>
  );
};

export default Onboarding;
