import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

const inputClass =
  "bg-[rgba(255,255,255,0.6)] border-[rgba(255,255,255,0.72)] rounded-[11px] text-[#1E1A1A] text-sm";

const labelClass =
  "text-[11px] font-medium text-[#9A9490] uppercase tracking-wide mb-1 block";

const glassDialog =
  "bg-[rgba(255,255,255,0.92)] backdrop-blur-[20px] backdrop-saturate-[1.5] border border-[rgba(255,255,255,0.72)] rounded-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.12)]";

export default function VillageProEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [nom, setNom] = useState("");
  const [specialite, setSpecialite] = useState("");
  const [structure, setStructure] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("intervenants")
        .select("nom, specialite, structure, telephone, email")
        .eq("id", id)
        .single();
      if (data) {
        setNom(data.nom ?? "");
        setSpecialite(data.specialite ?? "");
        setStructure(data.structure ?? "");
        setTelephone(data.telephone ?? "");
        setEmail(data.email ?? "");
      }
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!id || !nom.trim()) return;
    setSaving(true);
    await supabase
      .from("intervenants")
      .update({
        nom: nom.trim(),
        specialite: specialite.trim() || null,
        structure: structure.trim() || null,
        telephone: telephone.trim() || null,
        email: email.trim() || null,
      })
      .eq("id", id);
    setSaving(false);
    navigate(`/village/${id}`);
  };

  const handleDelete = async () => {
    if (!id) return;
    await supabase
      .from("intervenants")
      .update({ actif: false })
      .eq("id", id);
    navigate("/village");
  };

  if (loading) {
    return (
      <div className="min-h-screen px-4 pt-4 pb-24 flex items-center justify-center">
        <p className="text-sm text-[#9A9490]">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 pt-4 pb-24">
      {/* Back button */}
      <button
        onClick={() => navigate(`/village/${id}`)}
        className="flex items-center gap-1.5 mb-5"
      >
        <ArrowLeft className="w-4 h-4 text-[#8B74E0]" />
        <span className="text-sm font-medium text-[#8B74E0]">{nom || "Retour"}</span>
      </button>

      {/* Title */}
      <h1
        className="font-['Fraunces'] font-bold text-[#1E1A1A] mb-5"
        style={{ fontSize: 22 }}
      >
        Modifier les infos
      </h1>

      {/* Form */}
      <div className="flex flex-col gap-4">
        <div>
          <label className={labelClass}>Nom</label>
          <Input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className={inputClass}
            maxLength={100}
          />
        </div>
        <div>
          <label className={labelClass}>Spécialité</label>
          <Input
            value={specialite}
            onChange={(e) => setSpecialite(e.target.value)}
            placeholder="Ex: Kinésithérapeute"
            className={inputClass}
            maxLength={100}
          />
        </div>
        <div>
          <label className={labelClass}>Structure / Lieu</label>
          <Input
            value={structure}
            onChange={(e) => setStructure(e.target.value)}
            placeholder="Ex: Cabinet rue Yann d'Argent"
            className={inputClass}
            maxLength={200}
          />
        </div>
        <div>
          <label className={labelClass}>Téléphone</label>
          <Input
            value={telephone}
            onChange={(e) => setTelephone(e.target.value)}
            placeholder="06 12 34 56 78"
            className={inputClass}
            type="tel"
            maxLength={20}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nom@exemple.fr"
            className={inputClass}
            type="email"
            maxLength={255}
          />
        </div>
      </div>

      {/* Save */}
      <Button
        onClick={handleSave}
        disabled={!nom.trim() || saving}
        className="w-full rounded-xl text-white font-semibold mt-6 border-none"
        style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </Button>

      {/* Remove */}
      <button
        onClick={() => setConfirmDelete(true)}
        className="w-full flex items-center justify-center gap-1.5 mt-4 py-2.5 text-sm text-[#E8736A]"
      >
        <Trash2 className="w-4 h-4" />
        Retirer du village
      </button>

      {/* Confirm delete */}
      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent className={`${glassDialog} max-w-[320px]`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Fraunces'] text-lg">
              Retirer du village ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Retirer {nom} du village ? Les mémos existants ne seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[#9A9490] bg-transparent border-none hover:bg-transparent">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-[#E8736A] hover:bg-[#d4625a] text-white"
            >
              Retirer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
