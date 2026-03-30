import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { toast } from "sonner";
import { MedicamentCard } from "@/components/profile/MedicamentCard";
import { MedicamentModal } from "@/components/profile/MedicamentModal";
import { SoinCard } from "@/components/profile/SoinCard";
import { SoinModal } from "@/components/profile/SoinModal";
import { MaterielCard } from "@/components/profile/MaterielCard";
import { MaterielModal } from "@/components/profile/MaterielModal";
import { Textarea } from "@/components/ui/textarea";

export default function ChildProfile() {
  const { enfantId } = useEnfantId();
  const navigate = useNavigate();
  const [prenom, setPrenom] = useState<string | null>(null);
  const [sexe, setSexe] = useState<string | null>(null);
  const [dateNaissance, setDateNaissance] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);

  // Inline editing
  const [editingField, setEditingField] = useState<string | null>(null);

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
    const { error } = await supabase
      .from("enfants")
      .update({ sexe: newValue })
      .eq("id", enfantId);
    if (error) {
      toast.error("Erreur de sauvegarde");
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
    const { count } = await supabase
      .from("soins")
      .select("*", { count: "exact", head: true })
      .eq("enfant_id", enfantId)
      .eq("actif", true);
    if (count === 0) {
      await supabase.from("enfants").update({ has_soins: false }).eq("id", enfantId);
      setHasSoins(false);
    }
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
    const { count } = await supabase
      .from("materiel")
      .select("*", { count: "exact", head: true })
      .eq("enfant_id", enfantId)
      .eq("actif", true);
    if (count === 0) {
      await supabase.from("enfants").update({ has_materiel: false }).eq("id", enfantId);
      setHasMateriel(false);
    }
  };

  const saveInlineField = async (field: string, value: string | null) => {
    if (!enfantId) return;
    const updateData: Record<string, string | null> = {};
    if (field === "prenom") updateData.prenom = value;
    else if (field === "date") updateData.date_naissance = value || null;
    else if (field === "diagnostic") updateData.diagnostic_label = value || null;
    const { error } = await supabase.from("enfants").update(updateData).eq("id", enfantId);
    if (error) toast.error("Erreur de sauvegarde");
    setEditingField(null);
  };

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
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1" style={{ fontFamily: "DM Sans" }}>
            Informations
          </span>
          <div
            className="rounded-2xl p-4 flex flex-col gap-3"
            style={{
              background: "rgba(255,255,255,0.55)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255,255,255,0.72)",
              boxShadow: "0 2px 12px rgba(139,116,224,0.06)",
            }}
          >
            {/* Prénom */}
            <div onClick={() => editingField !== "prenom" && setEditingField("prenom")} className={editingField !== "prenom" ? "cursor-pointer" : ""}>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5 uppercase" style={{ fontFamily: "DM Sans" }}>PRÉNOM</p>
              {editingField === "prenom" ? (
                <input
                  autoFocus
                  className="w-full text-sm text-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5"
                  style={{ fontFamily: "DM Sans" }}
                  defaultValue={prenom ?? ""}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v) { setEditingField(null); return; }
                    setPrenom(v);
                    saveInlineField("prenom", v);
                  }}
                  onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
                />
              ) : (
                <p className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>{prenom ?? "—"}</p>
              )}
            </div>

            {/* Date de naissance */}
            <div onClick={() => editingField !== "date" && setEditingField("date")} className={editingField !== "date" ? "cursor-pointer" : ""}>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5 uppercase" style={{ fontFamily: "DM Sans" }}>DATE DE NAISSANCE</p>
              {editingField === "date" ? (
                <input
                  autoFocus
                  type="date"
                  className="text-sm text-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5"
                  style={{ fontFamily: "DM Sans" }}
                  defaultValue={dateNaissance ?? ""}
                  onBlur={(e) => {
                    setDateNaissance(e.target.value || null);
                    saveInlineField("date", e.target.value);
                  }}
                />
              ) : (
                <p className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>
                  {dateNaissance ? new Date(dateNaissance).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : <span className="text-muted-foreground italic">Ajouter…</span>}
                </p>
              )}
            </div>

            {/* Diagnostic */}
            <div onClick={() => editingField !== "diagnostic" && setEditingField("diagnostic")} className={editingField !== "diagnostic" ? "cursor-pointer" : ""}>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5 uppercase" style={{ fontFamily: "DM Sans" }}>SITUATION</p>
              {editingField === "diagnostic" ? (
                <Textarea
                  autoFocus
                  autoResize
                  className="w-full text-sm text-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1"
                  style={{ fontFamily: "DM Sans", minHeight: 40 }}
                  defaultValue={diagnostic ?? ""}
                  onBlur={(e) => {
                    setDiagnostic(e.target.value.trim() || null);
                    saveInlineField("diagnostic", e.target.value.trim());
                  }}
                />
              ) : (
                <p className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>
                  {diagnostic ?? <span className="text-muted-foreground italic">Ajouter…</span>}
                </p>
              )}
            </div>

            {/* Genre */}
            <div>
              <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-1 uppercase" style={{ fontFamily: "DM Sans" }}>GENRE</p>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSexeChange("F")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    sexe === "F" ? "bg-primary/10 border-primary text-primary" : "bg-white/50 border-white/60 text-muted-foreground"
                  }`}
                >
                  Fille
                </button>
                <button
                  onClick={() => handleSexeChange("M")}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    sexe === "M" ? "bg-primary/10 border-primary text-primary" : "bg-white/50 border-white/60 text-muted-foreground"
                  }`}
                >
                  Garçon
                </button>
              </div>
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
                              onEdit={async (id, data) => {
                                await supabase.from("soins").update(data).eq("id", id);
                                fetchSoins();
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
                              onEdit={async (id, data) => {
                                await supabase.from("materiel").update(data).eq("id", id);
                                fetchMateriel();
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

    </div>
  );
}
