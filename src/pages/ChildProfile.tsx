import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "sonner";
import { MedicamentCard } from "@/components/profile/MedicamentCard";
import { MedicamentModal } from "@/components/profile/MedicamentModal";
import { SoinCard } from "@/components/profile/SoinCard";
import { SoinModal } from "@/components/profile/SoinModal";
import { MaterielCard } from "@/components/profile/MaterielCard";
import { MaterielModal } from "@/components/profile/MaterielModal";

export default function ChildProfile() {
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [sexe, setSexe] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dateNaissance, setDateNaissance] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  // Edit infos state
  const [editingInfos, setEditingInfos] = useState(false);
  const [editPrenom, setEditPrenom] = useState("");
  const [editDateNaissance, setEditDateNaissance] = useState("");
  const [editDiagnostic, setEditDiagnostic] = useState("");
  const [savingInfos, setSavingInfos] = useState(false);
  const [editSexe, setEditSexe] = useState<string | null>(null);

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

  // Materiel state
  const [materiel, setMateriel] = useState<any[]>([]);
  const [hasMateriel, setHasMateriel] = useState(false);
  const [materielModalOpen, setMaterielModalOpen] = useState(false);
  const [editingMateriel, setEditingMateriel] = useState<any>(null);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("enfants")
      .select("prenom, sexe, has_medicaments, has_soins, has_materiel, date_naissance, diagnostic_label")
      .eq("id", enfantId)
      .single()
      .then(({ data }) => {
        if (data) {
          setPrenom(data.prenom);
          setSexe(data.sexe);
          setHasMedicaments(data.has_medicaments ?? false);
          setHasSoins(data.has_soins ?? false);
          setHasMateriel(data.has_materiel ?? false);
          setDateNaissance(data.date_naissance ?? null);
          setDiagnostic(data.diagnostic_label ?? null);
        }
      });
  }, [enfantId]);

  useEffect(() => {
    if (!enfantId) return;
    Promise.all([fetchMedicaments(), fetchSoins(), fetchMateriel()]);
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
    const { count } = await supabase
      .from("medicaments")
      .select("*", { count: "exact", head: true })
      .eq("enfant_id", enfantId)
      .eq("actif", true);
    if (count === 0) {
      await supabase.from("enfants").update({ has_medicaments: false }).eq("id", enfantId);
      setHasMedicaments(false);
    }
  };

  const deleteSoin = async (id: string) => {
    await supabase.from("soins").update({ actif: false }).eq("id", id);
    fetchSoins();
  };

  const fetchMateriel = async () => {
    if (!enfantId) return;
    const { data } = await supabase
      .from("materiel")
      .select("*")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: true });
    if (data) {
      setMateriel(data);
      if (data.length > 0 && !hasMateriel) {
        setHasMateriel(true);
        await supabase.from("enfants").update({ has_materiel: true }).eq("id", enfantId);
      }
    }
  };

  const toggleHasMateriel = async (value: boolean) => {
    setHasMateriel(value);
    if (!enfantId) return;
    await supabase.from("enfants").update({ has_materiel: value }).eq("id", enfantId);
  };

  const deleteMateriel = async (id: string) => {
    await supabase.from("materiel").update({ actif: false }).eq("id", id);
    fetchMateriel();
  };

  const handleSaveInfos = async () => {
    if (!enfantId) return;
    setSavingInfos(true);
    const { error } = await supabase
      .from("enfants")
      .update({
        prenom: editPrenom.trim() || prenom,
        date_naissance: editDateNaissance || null,
        diagnostic_label: editDiagnostic.trim() || null,
        sexe: editSexe,
      })
      .eq("id", enfantId);
    setSavingInfos(false);
    if (!error) {
      setPrenom(editPrenom.trim() || prenom);
      setDateNaissance(editDateNaissance || null);
      setDiagnostic(editDiagnostic.trim() || null);
      setSexe(editSexe);
      setEditingInfos(false);
    }
  };

  const pillClass = (value: string) =>
    `px-4 py-2 rounded-full text-sm font-sans transition-all border ${
      sexe === value
        ? "bg-primary/10 border-primary text-primary font-medium"
        : "bg-white/50 border-white/60 text-muted-foreground"
    }`;

  return (
    <div className="flex min-h-screen flex-col" style={{ background: "linear-gradient(160deg, #EDE8F5 0%, #F5EEF0 40%, #EEF0F8 100%)", minHeight: "100vh" }}>
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3" style={{ background: "rgba(255,255,255,0.72)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", borderBottom: "1px solid rgba(255,255,255,0.6)", boxShadow: "0 2px 12px rgba(0,0,0,0.05)" }}>
        <button onClick={() => navigate("/timeline")} className="flex items-center gap-1 text-sm font-sans text-primary">
          <ArrowLeft size={18} />
          <span>Retour</span>
        </button>
      </header>
      <main className="flex flex-1 flex-col gap-8 px-5 pt-6 pb-28">
        <h2 className="text-2xl font-serif font-semibold text-foreground">Profil de {prenom || "mon enfant"}</h2>

        {/* ── INFORMATIONS ── */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between w-full mb-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider" style={{ fontFamily: "DM Sans" }}>
              Informations
            </span>
            <button
              onClick={() => {
                setEditPrenom(prenom ?? "");
                setEditDateNaissance(dateNaissance ?? "");
                setEditDiagnostic(diagnostic ?? "");
                setEditSexe(sexe);
                setEditingInfos(true);
              }}
              className="text-sm font-medium text-[#534AB7]"
              style={{ fontFamily: "DM Sans" }}
            >
              Modifier
            </button>
          </div>
          <div
            className="rounded-2xl p-4 flex flex-col divide-y divide-[rgba(139,116,224,0.1)]"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.72)",
              boxShadow: "0 2px 12px rgba(139,116,224,0.06)",
            }}
          >
            <div className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>Prénom</span>
              <span className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>{prenom ?? "—"}</span>
            </div>
            {dateNaissance && (
              <div className="flex items-center justify-between py-2.5">
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>Date de naissance</span>
                <span className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>
                  {new Date(dateNaissance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
            {diagnostic && (
              <div className="flex items-center justify-between py-2.5 last:pb-0">
                <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>Situation</span>
                <span className="text-sm font-medium text-foreground text-right max-w-[60%]" style={{ fontFamily: "DM Sans" }}>{diagnostic}</span>
              </div>
            )}
            <div className="flex items-center justify-between py-2.5 last:pb-0">
              <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>Genre</span>
              <span className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>
                {sexe === "F" ? "Fille" : sexe === "M" ? "Garçon" : "—"}
              </span>
            </div>
          </div>
        </div>

        {(() => {
          const sections = [
            {
              key: "medicaments",
              active: hasMedicaments,
              node: (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground" style={{ fontFamily: "DM Sans" }}>💊 Traitements</span>
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
              ),
            },
            {
              key: "soins",
              active: hasSoins,
              node: (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground" style={{ fontFamily: "DM Sans" }}>🩺 Soins particuliers</span>
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
              ),
            },
            {
              key: "materiel",
              active: hasMateriel,
              node: (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-base font-semibold text-foreground" style={{ fontFamily: "DM Sans" }}>🔧 Matériel</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans text-muted-foreground">
                        {hasMateriel ? "Actif" : "Inactif"}
                      </span>
                      <button
                        onClick={() => toggleHasMateriel(!hasMateriel)}
                        className="w-10 h-6 rounded-full transition-colors relative cursor-pointer"
                        style={{ background: hasMateriel ? "#E8A44A" : "#e5e7eb" }}
                      >
                        <span className={`block w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                          hasMateriel ? "translate-x-[18px]" : "translate-x-0.5"
                        }`} />
                      </button>
                    </div>
                  </div>
                  {hasMateriel && (
                    <div className="mt-1">
                      {materiel.length === 0 ? (
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground font-sans">
                            Aucun matériel renseigné
                          </p>
                          <button
                            onClick={() => { setEditingMateriel(null); setMaterielModalOpen(true); }}
                            className="mt-2 text-sm text-[#92560A] font-medium"
                          >
                            + Ajouter
                          </button>
                        </div>
                      ) : (
                        <>
                          {materiel.map((item) => (
                            <MaterielCard
                              key={item.id}
                              {...item}
                              onEdit={(id) => {
                                setEditingMateriel(materiel.find((m) => m.id === id));
                                setMaterielModalOpen(true);
                              }}
                              onDelete={deleteMateriel}
                            />
                          ))}
                          <button
                            onClick={() => { setEditingMateriel(null); setMaterielModalOpen(true); }}
                            className="flex items-center gap-1.5 text-sm text-[#92560A] font-medium mt-1 px-1"
                          >
                            <Plus size={14} />
                            Ajouter du matériel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ),
            },
          ];
          return [...sections]
            .sort((a, b) => Number(b.active) - Number(a.active))
            .map((s) => (
              <React.Fragment key={s.key}>{s.node}</React.Fragment>
            ));
        })()}
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

      <MaterielModal
        open={materielModalOpen}
        enfantId={enfantId || ""}
        initialData={editingMateriel}
        onSave={() => { setMaterielModalOpen(false); setEditingMateriel(null); fetchMateriel(); }}
        onClose={() => { setMaterielModalOpen(false); setEditingMateriel(null); }}
      />

      {editingInfos && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0"
            style={{ background: "rgba(0,0,0,0.5)" }}
            onClick={() => setEditingInfos(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[90vh] overflow-y-auto p-6 z-50">
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
            <h2
              className="text-xl font-semibold text-foreground mb-5"
              style={{ fontFamily: "'Fraunces', serif" }}
            >
              Modifier les informations
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
                  Prénom
                </label>
                <input
                  type="text"
                  value={editPrenom}
                  onChange={(e) => setEditPrenom(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B74E0] focus:ring-2 focus:ring-[#8B74E0]/10"
                  style={{ fontFamily: "DM Sans" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={editDateNaissance ?? ""}
                  onChange={(e) => setEditDateNaissance(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B74E0] focus:ring-2 focus:ring-[#8B74E0]/10"
                  style={{ fontFamily: "DM Sans" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
                  Situation ou diagnostic
                </label>
                <input
                  type="text"
                  value={editDiagnostic}
                  onChange={(e) => setEditDiagnostic(e.target.value)}
                  placeholder="ex : Paralysie cérébrale..."
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#8B74E0] focus:ring-2 focus:ring-[#8B74E0]/10"
                  style={{ fontFamily: "DM Sans" }}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block" style={{ fontFamily: "DM Sans" }}>
                  Genre
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditSexe(editSexe === "F" ? null : "F")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      editSexe === "F"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white/50 border-white/60 text-muted-foreground"
                    }`}
                  >
                    Fille
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditSexe(editSexe === "M" ? null : "M")}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                      editSexe === "M"
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-white/50 border-white/60 text-muted-foreground"
                    }`}
                  >
                    Garçon
                  </button>
                </div>
              </div>
            </div>
            <div className="space-y-3 mt-6">
              <button
                onClick={handleSaveInfos}
                disabled={savingInfos}
                className="w-full rounded-xl h-12 text-base text-white font-medium flex items-center justify-center disabled:opacity-50"
                style={{
                  background: "linear-gradient(135deg, #E8736A, #8B74E0)",
                  fontFamily: "DM Sans",
                }}
              >
                {savingInfos ? "Enregistrement..." : "Enregistrer"}
              </button>
              <button
                onClick={() => setEditingInfos(false)}
                className="w-full text-center text-sm text-muted-foreground hover:text-foreground py-2"
                style={{ fontFamily: "DM Sans" }}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
