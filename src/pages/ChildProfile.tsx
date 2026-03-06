import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "sonner";

export default function ChildProfile() {
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [sexe, setSexe] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("enfants")
      .select("prenom, sexe")
      .eq("id", enfantId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrenom(data.prenom);
          setSexe(data.sexe);
        }
      });
  }, [enfantId]);

  const handleSexeChange = async (value: string) => {
    if (!enfantId) return;
    const newValue = value === sexe ? null : value;
    setSexe(newValue);
    setSaving(true);
    const { error } = await supabase
      .from("enfants")
      .update({ sexe: newValue })
      .eq("id", enfantId);
    setSaving(false);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Profil mis à jour");
    }
  };

  const pillClass = (value: string) =>
    `px-4 py-2 rounded-full text-sm font-sans transition-all border ${
      sexe === value
        ? "bg-primary/10 border-primary text-primary font-medium"
        : "bg-white/50 border-white/60 text-muted-foreground"
    }`;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/timeline")} className="flex items-center gap-1 text-sm font-sans text-primary">
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-6 px-5 pt-8 pb-24">
        <h2 className="text-2xl font-serif font-semibold text-foreground">Profil de {prenom || "mon enfant"}</h2>

        {/* Sexe */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-sans font-medium text-foreground">Sexe</label>
          <div className="flex gap-2">
            <button className={pillClass("F")} onClick={() => handleSexeChange("F")} disabled={saving}>
              Fille {sexe === "F" && <Check size={14} className="inline ml-1" />}
            </button>
            <button className={pillClass("M")} onClick={() => handleSexeChange("M")} disabled={saving}>
              Garçon {sexe === "M" && <Check size={14} className="inline ml-1" />}
            </button>
          </div>
          <p className="text-xs font-sans text-muted-foreground">Utilisé pour personnaliser les textes (il/elle)</p>
        </div>

        <p className="text-sm font-sans text-muted-foreground mt-4">D'autres options de profil seront bientôt disponibles.</p>
      </main>
    </div>
  );
}