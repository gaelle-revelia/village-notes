import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const NouvelEvenement = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("memos").insert({
        user_id: user.id,
        enfant_id: enfantId,
        transcription_raw: title.trim(),
        content_structured: description.trim() ? { description: description.trim() } : null,
        processing_status: "done",
        type: "evenement" as any,
        memo_date: memoDate.toISOString().split("T")[0] as any,
      });
      if (error) throw error;
      toast({ title: "Événement enregistré ✓" });
      navigate("/timeline");
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer l'événement.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 px-4 py-3 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/timeline")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Nouvel événement</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />

          <div className="space-y-1.5">
            <Label>Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex : Première séance d'orthophonie" autoFocus />
          </div>

          <div className="space-y-1.5">
            <Label>Description (optionnel)</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails de l'événement…" className="min-h-[120px] rounded-xl resize-none" />
          </div>

          <Button onClick={handleSave} disabled={!title.trim() || saving} className="w-full rounded-xl h-12 text-base">
            <Send className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer l'événement"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NouvelEvenement;
