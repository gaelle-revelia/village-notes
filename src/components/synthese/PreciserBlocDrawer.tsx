import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import WiredMicOrb from "@/components/synthese/WiredMicOrb";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

interface PreciserBlocDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  bloc: { id: string; title: string; content: string; cas_usage: string } | null;
  enfantId: string;
  syntheseId: string;
  onBlockUpdated: (blocId: string, newContent: string) => void;
}

export default function PreciserBlocDrawer({ isOpen, onClose, bloc, enfantId, syntheseId, onBlockUpdated }: PreciserBlocDrawerProps) {
  const { toast } = useToast();
  const [precision, setPrecision] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const handleSubmit = async () => {
    if (!bloc || !precision.trim()) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-synthesis", {
        body: {
          type: "refine_block",
          enfant_id: enfantId,
          parent_context: {
            bloc_id: bloc.id,
            bloc_title: bloc.title,
            bloc_content: bloc.content,
            precision: precision.trim(),
            cas_usage: bloc.cas_usage,
            synthese_id: syntheseId,
          },
        },
      });
      if (error) throw error;
      if (data?.content) {
        onBlockUpdated(bloc.id, data.content);
        toast({ title: "Bloc mis à jour ✅" });
        setPrecision("");
        setExpanded(false);
        onClose();
      }
    } catch (e) {
      console.error("refine_block error:", e);
      toast({ title: "Une erreur est survenue — réessaie.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setPrecision("");
      setExpanded(false);
      onClose();
    }
  };

  return (
    <Drawer open={isOpen} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="text-lg font-serif font-semibold">✏️ Préciser ce bloc</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6 flex flex-col gap-4">
          {/* Current content preview */}
          {bloc && (
            <div>
              <span className="text-[12px] font-sans font-medium" style={{ color: "#9A9490" }}>
                Ce bloc actuellement :
              </span>
              <div className="mt-1.5 px-4 py-3" style={glassCard}>
                <p
                  className={`text-[13px] font-sans leading-relaxed ${!expanded ? "line-clamp-3" : ""}`}
                  style={{ color: "#1E1A1A" }}
                >
                  {bloc.content}
                </p>
              </div>
              {bloc.content.length > 150 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-1 text-[12px] font-sans font-medium"
                  style={{ color: "#8B74E0" }}
                >
                  {expanded ? "Réduire" : "Voir tout"}
                </button>
              )}
            </div>
          )}

          {/* Textarea */}
          <Textarea
            placeholder="Ajoute ta précision ici..."
            value={precision}
            onChange={(e) => setPrecision(e.target.value)}
            className="text-[14px] font-sans border-none italic placeholder:italic w-full"
            style={{ ...glassCard, borderRadius: 14, minHeight: 80 }}
            autoResize
          />

          {/* Voice input */}
          <WiredMicOrb
            disabled={isLoading}
            onTranscription={(text) => setPrecision((prev) => (prev ? prev + " " : "") + text)}
          />

          {/* CTA */}
          <button
            onClick={handleSubmit}
            disabled={!precision.trim() || isLoading}
            className={`w-full py-3.5 text-[15px] font-sans font-semibold transition-opacity ${isLoading ? "animate-pulse" : ""}`}
            style={{
              background: "linear-gradient(135deg, #E8736A, #8B74E0)",
              color: "#fff",
              borderRadius: 14,
              border: "none",
              opacity: precision.trim() && !isLoading ? 1 : 0.45,
            }}
          >
            {isLoading ? "Régénération en cours..." : "Régénérer ce bloc →"}
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
