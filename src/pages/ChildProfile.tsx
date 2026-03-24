import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "sonner";
import { MedicamentCard } from "@/components/profile/MedicamentCard";
import { MedicamentModal } from "@/components/profile/MedicamentModal";
import { SoinCard } from "@/components/profile/SoinCard";
import { SoinModal } from "@/components/profile/SoinModal";

export default function ChildProfile() {
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [sexe, setSexe] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Medicaments state
  const [medicaments, setMedicaments] = useState<any[]>([]);
  const [hasMedicaments, setHasMedicaments] = useState(false);
  const [medModalOpen, setMedModalOpen] = useState(false);
  const [editingMed, setEditingMed] = useState<any>(null);

  // Soins state
  const [soins, setSoins] = useState<any[]>([]);
  const [hasSoins, setHasSoins] = useState(false);
  const [soinModalOpen, setSoinModalOpen] = useState(false);
  const [editingSoin, setEditingSoin] = useState<any>(null);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("enfants")
      .select("prenom, sexe, has_medicaments, has_soins")
      .eq("id", enfantId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrenom(data.prenom);
          setSexe(data.sexe);
          setHasMedicaments(data.has_medicaments ?? false);
          setHasSoins(data.has_soins ?? false);
        }
      });
  }, [enfantId]);

  useEffect(() => {
    if (!enfantId) return;
    fetchMedicaments();
    fetchSoins();
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

  const fetchMedicaments = async () => {
    if (!enfantId) return;
    const { data } = await supabase
      .from("medicaments")
      .select("*")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: true });
    if (data) {
      setMedicaments(data);
      if (data.length > 0 && !hasMedicaments) {
        setHasMedicaments(true);
        await supabase.from("enfants").update({ has_medicaments: true }).eq("id", enfantId);
      }
    }
  };

  const fetchSoins = async () => {
    if (!enfantId) return;
    const { data } = await supabase
      .from("soins")
      .select("*")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: true });
    if (data) {
      setSoins(data);
      if (data.length > 0 && !hasSoins) {
        setHasSoins(true);
        await supabase.from("enfants").update({ has_soins: true }).eq("id", enfantId);
      }
    }
  };

  const toggleHasMedicaments = async (value: boolean) => {
    setHasMedicaments(value);
    if (!enfantId) return;
    await supabase.from("enfants").update({ has_medicaments: value }).eq("id", enfantId);
  };

  const toggleHasSoins = async (value: boolean) => {
    setHasSoins(value);
    if (!enfantId) return;
    await supabase.from("enfants").update({ has_soins: value }).eq("id", enfantId);
  };

  const deleteMedicament = async (id: string) => {
    await supabase.from("medicaments").update({ actif: false }).eq("id", id);
    fetchMedicaments();
  };

  const deleteSoin = async (id: string) => {
    await supabase.from("soins").update({ actif: false }).eq("id", id);
    fetchSoins();
  };

  const pillClass = (value: string) =>
    `px-4 py-2 rounded-full text-sm font-sans transition-all border ${
      sexe === value
        ? "bg-primary/10 border-primary text-primary font-medium"
        : "bg-white/50 border-white/60 text-muted-foreground"
    }`;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "linear-gradient(160deg, #EDE8F5 0%, #F5EEF0 40%, #EEF0F8 100%)" }}>
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

        {/* ── TRAITEMENTS ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-sans font-medium text-foreground">💊 Traitements</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans text-muted-foreground">
                {hasMedicaments ? "Actif" : "Inactif"}
              </span>
              <button
                onClick={() => toggleHasMedicaments(!hasMedicaments)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hasMedicaments ? "bg-[#8B74E0]" : "bg-gray-200"
                }`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  hasMedicaments ? "translate-x-[18px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </div>

          {hasMedicaments && (
            <div className="mt-1">
              {medicaments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground font-sans">
                    Aucun traitement renseigné
                  </p>
                  <button
                    onClick={() => { setEditingMed(null); setMedModalOpen(true); }}
                    className="mt-2 text-sm text-[#534AB7] font-medium"
                  >
                    + Ajouter
                  </button>
                </div>
              ) : (
                <>
                  {medicaments.map((med) => (
                    <MedicamentCard
                      key={med.id}
                      {...med}
                      onEdit={(id) => {
                        setEditingMed(medicaments.find((m) => m.id === id));
                        setMedModalOpen(true);
                      }}
                      onDelete={deleteMedicament}
                    />
                  ))}
                  <button
                    onClick={() => { setEditingMed(null); setMedModalOpen(true); }}
                    className="flex items-center gap-1.5 text-sm text-[#534AB7] font-medium mt-1 px-1"
                  >
                    <Plus size={14} />
                    Ajouter un médicament
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── SOINS PARTICULIERS ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-sans font-medium text-foreground">🩺 Soins particuliers</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-sans text-muted-foreground">
                {hasSoins ? "Actif" : "Inactif"}
              </span>
              <button
                onClick={() => toggleHasSoins(!hasSoins)}
                className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${
                  hasSoins ? "bg-[#44A882]" : "bg-gray-200"
                }`}
              >
                <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  hasSoins ? "translate-x-[18px]" : "translate-x-0.5"
                }`} />
              </button>
            </div>
          </div>

          {hasSoins && (
            <div className="mt-1">
              {soins.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground font-sans">
                    Aucun soin spécifique renseigné
                  </p>
                  <button
                    onClick={() => { setEditingSoin(null); setSoinModalOpen(true); }}
                    className="mt-2 text-sm text-[#085041] font-medium"
                  >
                    + Ajouter
                  </button>
                </div>
              ) : (
                <>
                  {soins.map((soin) => (
                    <SoinCard
                      key={soin.id}
                      {...soin}
                      onEdit={(id) => {
                        setEditingSoin(soins.find((s) => s.id === id));
                        setSoinModalOpen(true);
                      }}
                      onDelete={deleteSoin}
                    />
                  ))}
                  <button
                    onClick={() => { setEditingSoin(null); setSoinModalOpen(true); }}
                    className="flex items-center gap-1.5 text-sm text-[#085041] font-medium mt-1 px-1"
                  >
                    <Plus size={14} />
                    Ajouter un soin
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      <MedicamentModal
        open={medModalOpen}
        enfantId={enfantId || ""}
        initialData={editingMed}
        onSave={() => { setMedModalOpen(false); setEditingMed(null); fetchMedicaments(); }}
        onClose={() => { setMedModalOpen(false); setEditingMed(null); }}
      />

      <SoinModal
        open={soinModalOpen}
        enfantId={enfantId || ""}
        initialData={editingSoin}
        onSave={() => { setSoinModalOpen(false); setEditingSoin(null); fetchSoins(); }}
        onClose={() => { setSoinModalOpen(false); setEditingSoin(null); }}
      />
    </div>
  );
}
