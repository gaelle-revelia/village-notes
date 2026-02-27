import { useEffect, useState } from "react";
import { useNavigate, useParams, Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface StructuredContent {
  resume?: string;
  details?: string[];
  suggestions?: string[];
  tags?: string[];
  intervenant_detected?: string | null;
  // Support legacy format
  points_cles?: string[];
}

interface MemoData {
  id: string;
  memo_date: string;
  content_structured: StructuredContent | null;
  transcription_raw: string | null;
  intervenant_id: string | null;
  intervenants?: { nom: string; specialite: string | null } | null;
}

const TAG_DOMAIN_COLORS: Record<string, string> = {
  moteur: "#6B8CAE",
  motricité: "#6B8CAE",
  sensoriel: "#7C9885",
  cognitif: "#C4A162",
  social: "#9B8DB5",
  administratif: "#A8A0A8",
};

function getTagColor(tag: string): string {
  const lower = tag.toLowerCase();
  for (const [key, color] of Object.entries(TAG_DOMAIN_COLORS)) {
    if (lower.includes(key)) return color;
  }
  return "#A8A0A8";
}

const MemoResult = () => {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [memo, setMemo] = useState<MemoData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || !user) return;
    supabase
      .from("memos")
      .select("id, memo_date, content_structured, transcription_raw, intervenant_id, intervenants(nom, specialite)")
      .eq("id", id)
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        setMemo(data as any);
        setLoading(false);
      });
  }, [id, user]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Chargement...</div>
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!memo) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Mémo introuvable.</p>
      </div>
    );
  }

  const structured = memo.content_structured;
  const details = structured?.details || structured?.points_cles || [];
  const suggestions = structured?.suggestions || [];
  const tags = structured?.tags || [];
  const intervenantName = (memo.intervenants as any)?.nom || null;
  const formattedDate = format(new Date(memo.memo_date), "dd MMMM yyyy", { locale: fr });

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/timeline")}
          className="text-muted-foreground hover:text-foreground text-sm flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la timeline
        </button>
      </header>

      <main className="flex-1 px-4 py-6">
        <div className="mx-auto max-w-[400px] space-y-6">
          {/* Title */}
          <div className="text-center space-y-1">
            <h2 className="font-serif text-2xl font-semibold text-card-foreground flex items-center justify-center gap-2">
              <span style={{ color: "hsl(var(--vert-nature))" }}>✅</span>
              Mémo enregistré
            </h2>
            <p className="text-sm text-muted-foreground">
              {formattedDate}
              {intervenantName && ` · ${intervenantName}`}
            </p>
          </div>

          {/* Resume card */}
          {structured?.resume && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_8px_rgba(42,42,42,0.06)]">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Résumé
              </h3>
              <p className="text-[15px] leading-relaxed text-foreground">{structured.resume}</p>
            </div>
          )}

          {/* Details card */}
          {details.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_8px_rgba(42,42,42,0.06)]">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Détails
              </h3>
              <ul className="space-y-2">
                {details.map((d, i) => (
                  <li key={i} className="flex gap-2 text-[15px] text-foreground">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions card */}
          {suggestions.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-5 shadow-[0_2px_8px_rgba(42,42,42,0.06)]">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                À retenir
              </h3>
              <ul className="space-y-2">
                {suggestions.map((s, i) => (
                  <li key={i} className="flex gap-2 text-[15px] text-foreground">
                    <span className="mt-0.5">→</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag, i) => (
                <span
                  key={i}
                  className="rounded-lg px-3 py-1.5 text-sm bg-card"
                  style={{
                    borderLeft: `4px solid ${getTagColor(tag)}`,
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Bottom button */}
          <Button
            onClick={() => navigate("/timeline")}
            className="w-full rounded-xl"
            style={{
              minHeight: "48px",
              backgroundColor: "hsl(var(--primary))",
            }}
          >
            Retour à la timeline
          </Button>
        </div>
      </main>
    </div>
  );
};

export default MemoResult;
