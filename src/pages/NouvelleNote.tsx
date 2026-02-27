import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { IntervenantSelect } from "@/components/memo/IntervenantSelect";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const NouvelleNote = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("memos").insert({
        user_id: user.id,
        enfant_id: enfantId,
        intervenant_id: intervenantId,
        transcription_raw: text.trim(),
        processing_status: "done",
        type: "note" as any,
        memo_date: memoDate.toISOString().split("T")[0] as any,
      });
      if (error) throw error;
      toast({ title: "Note enregistrée ✓" });
      navigate("/timeline");
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer la note.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-card px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate("/timeline")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-semibold text-card-foreground">Note écrite</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
          <IntervenantSelect enfantId={enfantId} value={intervenantId} onChange={setIntervenantId} />

          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Décrivez la séance en quelques mots…"
            className="min-h-[180px] rounded-xl resize-none"
            autoFocus
          />

          <Button onClick={handleSave} disabled={!text.trim() || saving} className="w-full rounded-xl h-12 text-base">
            <Send className="mr-2 h-4 w-4" />
            {saving ? "Enregistrement…" : "Enregistrer la note"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NouvelleNote;
