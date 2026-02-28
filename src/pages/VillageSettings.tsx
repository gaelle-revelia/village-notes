import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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

type Intervenant = {
  id: string;
  nom: string;
  specialite: string | null;
  type: string;
};

function getAvatarGradient(specialite: string | null, type: string): string {
  const s = (specialite ?? "").toLowerCase();
  if (s.includes("kiné") || s.includes("kine") || s.includes("moteur") || s.includes("motric"))
    return "linear-gradient(135deg, #E8736A, #E8845A)";
  if (s.includes("psychomot") || s.includes("psycho"))
    return "linear-gradient(135deg, #8B74E0, #5CA8D8)";
  if (s.includes("ergo"))
    return "linear-gradient(135deg, #44A882, #4E96C8)";
  if (s.includes("ortho"))
    return "linear-gradient(135deg, #44A882, #4E96C8)";
  if (type === "famille" || s.includes("parent") || s.includes("famille"))
    return "linear-gradient(135deg, #E8736A, #C85A8A)";
  return "linear-gradient(135deg, #8A9BAE, #6B7F94)";
}

export default function VillageSettings() {
  const navigate = useNavigate();
  const { enfantId, loading: enfantLoading } = useEnfantId();

  const [tab, setTab] = useState<"pro" | "famille">("pro");
  const [members, setMembers] = useState<Intervenant[]>([]);
  const [loading, setLoading] = useState(true);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [newNom, setNewNom] = useState("");
  const [newSpecialite, setNewSpecialite] = useState("");
  const [newType, setNewType] = useState<"pro" | "famille">("pro");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Intervenant | null>(null);

  const fetchMembers = async () => {
    if (!enfantId) return;
    setLoading(true);
    const { data } = await supabase
      .from("intervenants")
      .select("id, nom, specialite, type")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("created_at", { ascending: true });
    setMembers(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!enfantLoading && enfantId) fetchMembers();
  }, [enfantId, enfantLoading]);

  const filtered = members.filter((m) => m.type === tab);

  const handleAdd = async () => {
    if (!newNom.trim() || !enfantId) return;
    setSaving(true);
    await supabase.from("intervenants").insert({
      nom: newNom.trim(),
      specialite: newSpecialite.trim() || null,
      type: newType,
      enfant_id: enfantId,
      actif: true,
    });
    setSaving(false);
    setAddOpen(false);
    setNewNom("");
    setNewSpecialite("");
    setNewType("pro");
    fetchMembers();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await supabase
      .from("intervenants")
      .update({ actif: false })
      .eq("id", deleteTarget.id);
    setDeleteTarget(null);
    fetchMembers();
  };

  const glassCard =
    "bg-[rgba(255,255,255,0.52)] backdrop-blur-[16px] backdrop-saturate-[1.6] border border-[rgba(255,255,255,0.72)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]";

  return (
    <div className="min-h-screen px-4 pt-4 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/30 transition"
        >
          <ArrowLeft className="w-5 h-5 text-[#1E1A1A]" />
        </button>
        <h1 className="font-['Fraunces'] text-xl font-semibold text-[#1E1A1A]">
          Mon Village
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {([
          { key: "pro" as const, label: "Professionnels" },
          { key: "famille" as const, label: "Famille" },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              tab === key
                ? "bg-[#8B74E0] text-white shadow-md"
                : `${glassCard} text-[#1E1A1A]`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Member list */}
      <div className="flex flex-col gap-3">
        {loading || enfantLoading ? (
          <p className="text-sm text-[#9A9490] text-center py-8">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#9A9490] text-center py-8">
            Aucun membre dans cette catégorie.
          </p>
        ) : (
          filtered.map((m) => (
            <div
              key={m.id}
              className={`${glassCard} flex items-center gap-3 px-4 py-3`}
            >
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                style={{ background: getAvatarGradient(m.specialite, m.type) }}
              >
                {m.nom.charAt(0).toUpperCase()}
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#1E1A1A] truncate">
                  {m.nom}
                </p>
                {m.specialite && (
                  <p className="text-xs text-[#9A9490] truncate">
                    {m.specialite}
                  </p>
                )}
              </div>
              {/* Delete */}
              <button
                onClick={() => setDeleteTarget(m)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/40 transition"
              >
                <Trash2 className="w-4 h-4 text-[#9A9490]" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Add button */}
      <button
        onClick={() => {
          setNewType(tab);
          setAddOpen(true);
        }}
        className={`${glassCard} w-full mt-5 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-[#8B74E0]`}
      >
        <Plus className="w-4 h-4" />
        Ajouter un membre
      </button>

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className={`${glassCard} border-none max-w-[340px]`}>
          <DialogHeader>
            <DialogTitle className="font-['Fraunces'] text-lg">
              Nouveau membre
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            <div>
              <Label className="text-xs text-[#9A9490] mb-1">Nom</Label>
              <Input
                value={newNom}
                onChange={(e) => setNewNom(e.target.value)}
                placeholder="Prénom Nom"
                className="bg-white/40 border-white/60"
              />
            </div>
            <div>
              <Label className="text-xs text-[#9A9490] mb-1">Spécialité</Label>
              <Input
                value={newSpecialite}
                onChange={(e) => setNewSpecialite(e.target.value)}
                placeholder="Ex: Kinésithérapeute"
                className="bg-white/40 border-white/60"
              />
            </div>
            <div>
              <Label className="text-xs text-[#9A9490] mb-1">Type</Label>
              <Select
                value={newType}
                onValueChange={(v) => setNewType(v as "pro" | "famille")}
              >
                <SelectTrigger className="bg-white/40 border-white/60">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pro">Professionnel</SelectItem>
                  <SelectItem value="famille">Famille</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setAddOpen(false)}
              className="text-[#9A9490]"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!newNom.trim() || saving}
              className="bg-[#8B74E0] hover:bg-[#7A63CF] text-white"
            >
              {saving ? "…" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent className={`${glassCard} border-none max-w-[320px]`}>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-['Fraunces'] text-lg">
              Retirer du village ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Retirer {deleteTarget?.nom} du village ? Les mémos existants ne
              seront pas affectés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-[#9A9490]">
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
