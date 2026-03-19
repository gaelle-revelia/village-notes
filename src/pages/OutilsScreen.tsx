import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, CalendarDays, Share2, Sparkles, Wind } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";

type Intervenant = {
  id: string;
  nom: string;
  specialite: string | null;
};

const TOOLS = [
  { label: "Suivi d'activités", icon: Activity, route: "/outils/activites", active: true },
  { label: "Synthèse magique", icon: Sparkles, route: "/outils/synthese", active: true },
  { label: "Cohérence cardiaque", subtitle: "Respiration guidée", icon: Wind, route: "/outils/coherence", active: true, iconBg: "linear-gradient(135deg, #E8A44A, #E8736A)", iconColor: "#fff" },
  { label: "Planning", icon: CalendarDays, route: null, active: false },
  { label: "Export", icon: Share2, route: null, active: false },
] as const;

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const OutilsScreen = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [loadingIntervenants, setLoadingIntervenants] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !enfantId) return;

    let cancelled = false;
    setLoadingIntervenants(true);

    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("nom")
      .then(({ data, error }) => {
        if (cancelled) return;

        if (error) {
          toast({
            title: "Impossible de charger les membres du village",
            description: "Réessayez dans un instant.",
            variant: "destructive",
          });
          setIntervenants([]);
        } else {
          setIntervenants(data ?? []);
        }

        setLoadingIntervenants(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, enfantId, toast]);

  const resetForm = () => {
    setQuestion("");
    setSelectedIds([]);
  };

  const toggleIntervenant = (id: string) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion || !user || !enfantId) return;

    setSubmitting(true);

    const { error } = await supabase.from("questions").insert({
      parent_id: user.id,
      child_id: enfantId,
      text: trimmedQuestion,
      linked_pro_ids: selectedIds,
      status: "to_ask",
    });

    setSubmitting(false);

    if (error) {
      toast({
        title: "Impossible d'ajouter la question",
        description: "Réessayez dans un instant.",
        variant: "destructive",
      });
      return;
    }

    handleOpenChange(false);
    toast({
      title: "Question ajoutée",
      description: "Votre question a bien été enregistrée.",
    });
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
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 30, fontWeight: 700, color: "#1E1A1A", letterSpacing: -0.5 }}>Outils</h1>
        <ProfileAvatar />
      </header>

      <main className="flex-1 px-4 pt-6 pb-24">
        <div className="mb-4">
          <Button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!user || !enfantId}
            className="w-full"
          >
            Nouvelle question
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {TOOLS.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.label}
                disabled={!tool.active}
                onClick={() => tool.route && navigate(tool.route)}
                className="relative flex flex-col items-center justify-center gap-3 p-5 text-center transition-transform active:scale-[0.97]"
                style={{
                  ...glassCard,
                  opacity: tool.active ? 1 : 0.5,
                  cursor: tool.active ? "pointer" : "default",
                  minHeight: 140,
                }}
              >
                {!tool.active && (
                  <span
                    className="absolute top-2.5 right-2.5 text-[9px] font-sans font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(139,116,224,0.15)", color: "#8B74E0" }}
                  >
                    Bientôt
                  </span>
                )}
                <div
                  className="flex items-center justify-center rounded-xl"
                  style={{
                    width: 44,
                    height: 44,
                    background: tool.active
                      ? ("iconBg" in tool && tool.iconBg ? tool.iconBg : "linear-gradient(135deg, #E8736A, #8B74E0)")
                      : "rgba(138,155,174,0.15)",
                  }}
                >
                  <Icon size={22} color={tool.active ? ("iconColor" in tool && tool.iconColor ? tool.iconColor : "#fff") : "#8A9BAE"} strokeWidth={2} />
                </div>
                <span
                  className="text-[13px] font-sans font-medium leading-tight"
                  style={{ color: tool.active ? "#1E1A1A" : "#9A9490" }}
                >
                  {tool.label}
                </span>
                {"subtitle" in tool && tool.subtitle && (
                  <span
                    className="text-[10px] font-sans font-normal leading-tight"
                    style={{ color: "#9A9490", marginTop: -2 }}
                  >
                    {tool.subtitle}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </main>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvelle question</DialogTitle>
            <DialogDescription>
              Ajoutez une question à poser à un ou plusieurs membres du village.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question-text">Votre question</Label>
              <Textarea
                id="question-text"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="Écrivez votre question ici"
                required
                className="min-h-28 w-full ml-0"
              />
            </div>

            <div className="space-y-2">
              <Label>Professionnels liés</Label>
              <div className="max-h-56 space-y-2 overflow-y-auto rounded-md border border-input bg-background p-2">
                {loadingIntervenants ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Chargement…</p>
                ) : intervenants.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">Aucun membre disponible.</p>
                ) : (
                  intervenants.map((intervenant) => {
                    const selected = selectedIds.includes(intervenant.id);

                    return (
                      <button
                        key={intervenant.id}
                        type="button"
                        onClick={() => toggleIntervenant(intervenant.id)}
                        className="flex w-full items-start justify-between gap-3 rounded-md border border-input px-3 py-2 text-left transition-colors hover:bg-accent"
                        aria-pressed={selected}
                      >
                        <div>
                          <p className="text-sm font-medium text-foreground">{intervenant.nom}</p>
                          {intervenant.specialite && (
                            <p className="text-xs text-muted-foreground">{intervenant.specialite}</p>
                          )}
                        </div>
                        <span className="text-xs font-medium text-muted-foreground">
                          {selected ? "Sélectionné" : "Choisir"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={submitting || !question.trim() || !user || !enfantId}>
              {submitting ? "Ajout…" : "Ajouter"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNavBar />
    </div>
  );
};

export default OutilsScreen;
