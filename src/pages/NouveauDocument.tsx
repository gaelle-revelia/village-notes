import { useState, useRef } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { MemoDatePicker } from "@/components/memo/MemoDatePicker";
import { IntervenantSelect } from "@/components/memo/IntervenantSelect";
import { Button } from "@/components/ui/button";

const ACCEPTED = "application/pdf,image/png,image/jpeg,image/webp";

const NouveauDocument = () => {
  const { user, loading: authLoading } = useAuth();
  const { enfantId } = useEnfantId();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [memoDate, setMemoDate] = useState<Date>(new Date());
  const [intervenantId, setIntervenantId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="animate-pulse text-muted-foreground">Chargement...</div></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;

  const handleSave = async () => {
    if (!file) return;
    setSaving(true);
    try {
      // Create memo first to get ID
      const { data: memo, error: memoError } = await supabase
        .from("memos")
        .insert({
          user_id: user.id,
          enfant_id: enfantId,
          intervenant_id: intervenantId,
          processing_status: "done",
          type: "document" as any,
          memo_date: memoDate.toISOString().split("T")[0] as any,
        })
        .select("id")
        .single();
      if (memoError || !memo) throw new Error("Failed to create memo");

      // Upload file
      const ext = file.name.split(".").pop() || "bin";
      const storagePath = `${user.id}/${memo.id}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("voice-memos")
        .upload(storagePath, file, { contentType: file.type, upsert: true });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from("voice-memos").getPublicUrl(storagePath);

      // Update memo with file_url
      await supabase
        .from("memos")
        .update({ file_url: urlData.publicUrl } as any)
        .eq("id", memo.id);

      toast({ title: "Document enregistré ✓" });
      navigate("/timeline");
    } catch (err) {
      console.error(err);
      toast({ title: "Erreur", description: "Impossible d'enregistrer le document.", variant: "destructive" });
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
        <h1 className="text-xl font-semibold text-card-foreground">Nouveau document</h1>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          <MemoDatePicker date={memoDate} onDateChange={setMemoDate} />
          <IntervenantSelect enfantId={enfantId} value={intervenantId} onChange={setIntervenantId} />

          <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />

          <button
            onClick={() => fileRef.current?.click()}
            className="w-full rounded-xl border-2 border-dashed border-muted-foreground/30 p-8 text-center text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
          >
            {file ? (
              <span className="flex items-center justify-center gap-2"><FileText className="h-5 w-5" />{file.name}</span>
            ) : (
              <span className="flex flex-col items-center gap-2"><Upload className="h-6 w-6" />PDF ou photo</span>
            )}
          </button>

          <Button onClick={handleSave} disabled={!file || saving} className="w-full rounded-xl h-12 text-base">
            {saving ? "Envoi…" : "Enregistrer le document"}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default NouveauDocument;
