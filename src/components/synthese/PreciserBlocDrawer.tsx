import { useState } from "react";
import { ArrowLeft } from "lucide-react";
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
        onClose();
      }
    } catch (e) {
      console.error("refine_block error:", e);
      toast({ title: "Une erreur est survenue — réessaie.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setPrecision("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        flexDirection: "column",
        background: "linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%)",
      }}
    >
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
        <button onClick={handleClose} className="flex items-center justify-center" aria-label="Retour">
          <ArrowLeft size={20} style={{ color: "#1E1A1A" }} />
        </button>
        <div>
          <h1 className="font-serif" style={{ fontSize: 16, fontWeight: 600, color: "#1E1A1A", margin: 0 }}>
            Préciser ce bloc
          </h1>
          {bloc && (
            <p className="font-sans" style={{ fontSize: 11, color: "#9A9490", margin: 0 }}>
              {bloc.title}
            </p>
          )}
        </div>
      </header>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16, paddingBottom: 128 }}>
        {bloc && (
          <>
            {/* Section: Bloc actuel */}
            <p
              className="font-sans"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9A9490",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Bloc actuel
            </p>
            <div style={{ ...glassCard, padding: 14, marginBottom: 20 }}>
              <p className="font-sans" style={{ fontSize: 13, color: "#1E1A1A", lineHeight: 1.6, margin: 0 }}>
                {bloc.content}
              </p>
            </div>

            {/* Section: Ta précision */}
            <p
              className="font-sans"
              style={{
                fontSize: 11,
                fontWeight: 500,
                color: "#9A9490",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: 8,
              }}
            >
              Ta précision
            </p>
            <Textarea
              placeholder="Ajoute ta précision ici…"
              value={precision}
              onChange={(e) => setPrecision(e.target.value)}
              className="text-[14px] font-sans border-none italic placeholder:italic w-full"
              style={{ ...glassCard, borderRadius: 14, minHeight: 80 }}
              autoResize
            />

            {/* Voice input */}
            <div className="flex justify-center mt-4">
              <WiredMicOrb
                disabled={isLoading}
                onTranscription={(text) => setPrecision((prev) => (prev ? prev + " " : "") + text)}
              />
            </div>
          </>
        )}
      </div>

      {/* Sticky CTA */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 16px 24px",
          background: "transparent",
        }}
      >
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
    </div>
  );
}
