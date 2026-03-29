import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, User, Brain, Moon, PersonStanding, Users, Activity, Pill, Bike, Mail } from "lucide-react";
import BottomNavBar from "@/components/BottomNavBar";
import PreciserBlocDrawer from "@/components/synthese/PreciserBlocDrawer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useEnfantId } from "@/hooks/useEnfantId";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const glassCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.38)",
  backdropFilter: "blur(16px) saturate(1.6)",
  WebkitBackdropFilter: "blur(16px) saturate(1.6)",
  border: "1px solid rgba(255,255,255,0.85)",
  borderRadius: 16,
  boxShadow: "0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)",
};

const iconMap: Record<string, React.ReactNode> = {
  User: <User size={18} style={{ color: "#8B74E0" }} />,
  Brain: <Brain size={18} style={{ color: "#8B74E0" }} />,
  Moon: <Moon size={18} style={{ color: "#8B74E0" }} />,
  PersonStanding: <PersonStanding size={18} style={{ color: "#8B74E0" }} />,
  Users: <Users size={18} style={{ color: "#8B74E0" }} />,
  Activity: <Activity size={18} style={{ color: "#8B74E0" }} />,
  Pill: <Pill size={18} style={{ color: "#8B74E0" }} />,
  Bike: <Bike size={18} style={{ color: "#8B74E0" }} />,
};

interface Block {
  id: string;
  title: string;
  icon?: string;
  content: string;
}

const SectionSeparator = ({ text }: { text: string }) => (
  <div className="flex items-center gap-3 my-5">
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
    <span className="text-[10px] font-sans font-medium tracking-widest uppercase" style={{ color: "#9A9490" }}>{text}</span>
    <div className="flex-1 h-px" style={{ background: "rgba(154,148,144,0.25)" }} />
  </div>
);

const ResultCard = ({ icon, title, body, onPreciser }: { icon: React.ReactNode; title: string; body: string; onPreciser?: () => void }) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mb-4 px-5 py-4" style={glassCard}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h3 className="text-[16px] font-serif font-semibold" style={{ color: "#1E1A1A" }}>{title}</h3>
      </div>
      <p className="text-[14px] font-sans leading-relaxed mb-3" style={{ color: "#1E1A1A" }}>{body}</p>
      <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
        <button
          onClick={() => { navigator.clipboard.writeText(body); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.48)", border: "1px solid rgba(139,116,224,0.3)", color: "#8B74E0", cursor: "pointer" }}
        >
          {copied ? "Copié ✓" : "Copier"}
        </button>
        <button
          onClick={onPreciser}
          style={{ flex: 1, padding: "9px", borderRadius: 10, fontSize: 12, fontWeight: 500, background: "rgba(255,255,255,0.48)", border: "1px solid rgba(232,115,106,0.3)", color: "#E8736A", cursor: "pointer" }}
        >
          Préciser ce bloc
        </button>
      </div>
    </div>
  );
};

export default function OutilsSyntheseTransmissionResultats() {
  const location = useLocation();
  const navigate = useNavigate();
  const syntheseId = location.state?.syntheseId as string | undefined;
  const { enfantId } = useEnfantId();
  const { toast } = useToast();

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [editingTitre, setEditingTitre] = useState(false);
  const [destinataire, setDestinataire] = useState("");
  const [parentPrenom, setParentPrenom] = useState("");
  const [enfantPrenom, setEnfantPrenom] = useState("");
  const [syntheseDate, setSyntheseDate] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [refineBloc, setRefineBloc] = useState<{ id: string; title: string; content: string; cas_usage: string } | null>(null);
  const [emailValue, setEmailValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!syntheseId) {
      navigate("/archives", { replace: true });
      return;
    }

    const fetchData = async () => {
      setLoading(true);

      const { data: s, error: err } = await supabase
        .from("syntheses")
        .select("contenu, created_at, enfant_id, titre, metadata")
        .eq("id", syntheseId)
        .maybeSingle();

      if (err || !s?.contenu) {
        setError("Impossible de charger le livret.");
        setLoading(false);
        return;
      }

      setSyntheseDate(
        new Date(s.created_at!).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
      );
      setTitre(s.titre ?? "");

      const meta = s.metadata as Record<string, any> | null;
      setDestinataire(meta?.destinataire ?? "");

      const [enfantResult, authResult] = await Promise.all([
        supabase.from("enfants").select("prenom").eq("id", s.enfant_id).maybeSingle(),
        supabase.auth.getUser(),
      ]);

      if (enfantResult.data?.prenom) setEnfantPrenom(enfantResult.data.prenom);

      const user = authResult.data?.user;
      if (user) {
        const { data: p } = await supabase.from("profiles").select("prenom").eq("user_id", user.id).maybeSingle();
        if (p?.prenom) setParentPrenom(p.prenom);
      }

      try {
        const parsed = JSON.parse(s.contenu);
        setBlocks(Array.isArray(parsed) ? parsed : parsed.blocks ?? parsed);
      } catch {
        setError("Format de données invalide.");
      }
      setLoading(false);
    };

    fetchData();
  }, [syntheseId, navigate]);

  const handleDelete = async () => {
    setIsDeleting(true);
    await supabase.from("syntheses").delete().eq("id", syntheseId);
    navigate("/archives");
  };

  const handleSendEmail = async () => {
    if (!emailValue.trim()) return;
    setIsSending(true);
    try {
      const { error: fnErr } = await supabase.functions.invoke("send-transmission-email", {
        body: {
          email: emailValue.trim(),
          parentPrenom,
          enfantPrenom,
          syntheseDate,
          destinataire,
          blocks: blocks.map((b) => ({ title: b.title, content: b.content })),
        },
      });
      if (fnErr) throw fnErr;
      setSent(true);
      toast({ title: "Email envoyé ✅" });
    } catch (e) {
      console.error("send-transmission-email error:", e);
      toast({ title: "Une erreur est survenue — réessayez.", variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const defaultTitle = destinataire ? `Transmission — ${destinataire}` : "Transmission";

  return (
    <div className="min-h-screen pb-28">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center justify-between px-4 py-3"
        style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}
      >
        <div className="flex items-center gap-3" style={{ minWidth: 0, flex: 1 }}>
          <button onClick={() => navigate("/archives")} className="p-1 flex-shrink-0" aria-label="Retour">
            <ArrowLeft size={22} color="#1E1A1A" />
          </button>
          <div style={{ minWidth: 0, flex: 1 }}>
            {editingTitre ? (
              <input
                autoFocus
                value={titre}
                onChange={(e) => setTitre(e.target.value)}
                onBlur={async () => {
                  setEditingTitre(false);
                  await supabase.from("syntheses").update({ titre: titre.trim() || null }).eq("id", syntheseId);
                }}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: "#1E1A1A", background: "none", border: "none", borderBottom: "1px solid #8B74E0", outline: "none", width: "100%", padding: "2px 0" }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 17, fontWeight: 600, color: "#1E1A1A", margin: 0 }}>
                  {titre || defaultTitle}
                </h1>
                <button onClick={() => setEditingTitre(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9A9490" strokeWidth="2" strokeLinecap="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
              </div>
            )}
            <p className="text-[11px]" style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}>
              Généré le {syntheseDate}
            </p>
          </div>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button disabled={isDeleting} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }} aria-label="Supprimer">
              <Trash2 size={18} color="#E8736A" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer ce livret ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="px-4 pt-4">
        {loading && <p className="text-center text-sm mt-10" style={{ color: "#9A9490" }}>Chargement…</p>}
        {error && <p className="text-center text-sm mt-10" style={{ color: "#E8736A" }}>{error}</p>}

        {!loading && !error && blocks.length > 0 && (
          <>
            <SectionSeparator text={`Livret de transmission — ${destinataire || enfantPrenom}`} />

            {destinataire && (
              <p style={{ fontSize: 11, color: "#9A9490", textAlign: "center", margin: "0 0 16px", fontFamily: "DM Sans, sans-serif" }}>
                Livret préparé pour : <span style={{ color: "#8B74E0", fontWeight: 500 }}>{destinataire}</span>
              </p>
            )}

            {blocks.map((block, i) => (
              <ResultCard
                key={block.id || i}
                icon={iconMap[block.icon || ""] || <User size={18} style={{ color: "#8B74E0" }} />}
                title={block.title}
                body={block.content}
                onPreciser={() => setRefineBloc({ id: block.id, title: block.title, content: block.content, cas_usage: "transmission" })}
              />
            ))}

            {/* Email bar */}
            <div className="my-5 px-1">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9A9490" }} />
                  <input
                    type="email"
                    placeholder="ton@email.com"
                    value={emailValue}
                    onChange={(e) => setEmailValue(e.target.value)}
                    style={{ ...glassCard, borderRadius: 999, height: 44, width: "100%", paddingLeft: 36, paddingRight: 12, fontSize: 13, border: "none", outline: "none", fontFamily: "DM Sans, sans-serif" }}
                  />
                </div>
                <button
                  onClick={handleSendEmail}
                  disabled={isSending || sent}
                  style={{ padding: "10px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600, background: "linear-gradient(135deg, #E8736A, #8B74E0)", color: "#fff", border: "none", cursor: "pointer", opacity: isSending || sent ? 0.7 : 1, whiteSpace: "nowrap" }}
                >
                  {sent ? "Envoyé ✓" : isSending ? "Envoi..." : "Envoyer →"}
                </button>
              </div>
            </div>

            <p className="text-center text-[10px] font-sans mb-6" style={{ color: "#9A9490" }}>
              Document généré par The Village à partir des observations de {parentPrenom || "Parent"}. À compléter et personnaliser avant partage. Généré le {syntheseDate}.
            </p>
          </>
        )}
      </div>

      {syntheseId && enfantId && (
        <PreciserBlocDrawer
          isOpen={!!refineBloc}
          onClose={() => setRefineBloc(null)}
          bloc={refineBloc}
          enfantId={enfantId}
          syntheseId={syntheseId}
          onBlockUpdated={(blocId, newContent) => {
            setBlocks((prev) => prev.map((b) => b.id === blocId ? { ...b, content: newContent } : b));
          }}
        />
      )}

      <BottomNavBar />
    </div>
  );
}
