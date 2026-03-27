import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEnfantId } from "@/hooks/useEnfantId";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AppSettings() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { role, loading: roleLoading } = useEnfantId();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("prenom")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setPrenom(data.prenom);
      });
  }, [user]);

  const isOwner = role === "owner";

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await signOut();
      navigate("/auth", { replace: true });
    } catch (err: any) {
      console.error("delete-account error:", err);
      toast.error(err.message || "Une erreur est survenue lors de la suppression.");
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  return (
    <div className="min-h-screen pb-8">
      {/* Header */}
      <div
        className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3"
        style={{
          background: "rgba(255,255,255,0.72)",
          backdropFilter: "blur(20px) saturate(1.5)",
          borderBottom: "1px solid rgba(255,255,255,0.6)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
        }}
      >
        <button onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft size={22} color="#1E1A1A" />
        </button>
        <h1
          className="text-xl font-semibold"
          style={{ fontFamily: "'Fraunces', serif", color: "#1E1A1A" }}
        >
          Paramètres
        </h1>
      </div>

      <div className="px-4 mt-6 space-y-6 max-w-lg mx-auto">
        {/* Section Mon compte */}
        <section>
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Fraunces', serif", color: "#1E1A1A" }}
          >
            Mon compte
          </h2>
          <div
            className="rounded-2xl p-4 space-y-3"
            style={{
              background: "rgba(255,255,255,0.38)",
              backdropFilter: "blur(16px) saturate(1.6)",
              border: "1px solid rgba(255,255,255,0.85)",
              boxShadow:
                "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}
              >
                Email
              </p>
              <p
                className="text-sm"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#1E1A1A" }}
              >
                {user?.email || "—"}
              </p>
            </div>
            <div>
              <p
                className="text-xs mb-0.5"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}
              >
                Prénom
              </p>
              <p
                className="text-sm"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#1E1A1A" }}
              >
                {prenom || "—"}
              </p>
            </div>
          </div>
        </section>

        {/* Section Zone de danger */}
        <section>
          <h2
            className="text-base font-semibold mb-3"
            style={{ fontFamily: "'Fraunces', serif", color: "#1E1A1A" }}
          >
            Zone de danger
          </h2>
          <div
            className="rounded-2xl p-4"
            style={{
              background: "rgba(255,255,255,0.38)",
              backdropFilter: "blur(16px) saturate(1.6)",
              border: "1px solid rgba(220, 38, 38, 0.2)",
              boxShadow:
                "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            <button
              disabled={isOwner || roleLoading || deleting}
              onClick={() => setShowConfirm(true)}
              className="w-full rounded-xl py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                fontFamily: "DM Sans, sans-serif",
                color: "rgb(220, 38, 38)",
                border: "1px solid rgba(220, 38, 38, 0.4)",
                background: "transparent",
              }}
            >
              Supprimer mon accès
            </button>

            {isOwner && (
              <p
                className="mt-3 text-xs italic leading-relaxed"
                style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}
              >
                En tant que responsable du village, la suppression de votre accès nécessite de transférer la gestion à un co-parent au préalable. Cette
                fonctionnalité arrive bientôt.
              </p>
            )}
          </div>
        </section>
      </div>

      {/* Confirmation modal */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm mx-4">
          <AlertDialogHeader>
            <AlertDialogTitle
              style={{ fontFamily: "'Fraunces', serif", color: "#1E1A1A" }}
            >
              Supprimer mon accès ?
            </AlertDialogTitle>
            <AlertDialogDescription
              className="text-sm leading-relaxed"
              style={{ fontFamily: "DM Sans, sans-serif", color: "#9A9490" }}
            >
              Vous n'aurez plus accès au village. Les mémos que vous avez créés resteront visibles pour
              les autres membres. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl"
              style={{ fontFamily: "DM Sans, sans-serif" }}
            >
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteAccount();
              }}
              className="rounded-xl"
              style={{
                fontFamily: "DM Sans, sans-serif",
                background: "rgb(220, 38, 38)",
                color: "white",
              }}
            >
              {deleting ? "Suppression…" : "Confirmer la suppression"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
