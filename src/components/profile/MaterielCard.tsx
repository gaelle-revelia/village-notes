import { useState } from "react";
import { ChevronRight, Wrench } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface MaterielCardProps {
  id: string;
  nom: string;
  conseils?: string | null;
  date_reception?: string | null;
  onEdit: (id: string, data: { nom: string; conseils?: string; date_reception?: string }) => void;
  onDelete: (id: string) => void;
}

export function MaterielCard({
  id, nom, conseils, date_reception, onEdit, onDelete,
}: MaterielCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draftNom, setDraftNom] = useState(nom);
  const [draftConseils, setDraftConseils] = useState(conseils || "");
  const [draftDate, setDraftDate] = useState(date_reception || "");

  const saveField = () => {
    if (!draftNom.trim()) {
      setDraftNom(nom);
      setEditingField(null);
      return;
    }
    onEdit(id, { nom: draftNom.trim(), conseils: draftConseils || undefined, date_reception: draftDate || undefined });
    setEditingField(null);
  };

  return (
    <div
      className="rounded-2xl p-4 mb-2.5 transition-all cursor-pointer"
      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 2px 12px rgba(232,164,74,0.06)" }}
      onClick={() => { setExpanded((p) => !p); setConfirmDelete(false); setEditingField(null); }}
    >
      <div className="flex items-center gap-3">
        <div className="bg-[#FAEEDA] rounded-[10px] w-9 h-9 flex items-center justify-center shrink-0">
          <Wrench className="h-4 w-4 text-[#92560A]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground text-[15px] truncate" style={{ fontFamily: "DM Sans" }}>
            {nom}
          </p>
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {expanded && (
        <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {/* Nom */}
          <EditableField
            label="NOM"
            editing={editingField === "nom"}
            onStartEdit={() => setEditingField("nom")}
          >
            {editingField === "nom" ? (
              <input
                autoFocus
                className="w-full text-sm text-card-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5"
                style={{ fontFamily: "DM Sans" }}
                value={draftNom}
                onChange={(e) => setDraftNom(e.target.value)}
                onBlur={saveField}
                onKeyDown={(e) => e.key === "Enter" && saveField()}
              />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftNom}</p>
            )}
          </EditableField>

          {/* Conseils */}
          <EditableField
            label="CONSEILS D'UTILISATION"
            editing={editingField === "conseils"}
            onStartEdit={() => setEditingField("conseils")}
          >
            {editingField === "conseils" ? (
              <Textarea
                autoFocus
                autoResize
                className="w-full text-sm text-card-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1"
                style={{ fontFamily: "DM Sans", minHeight: 40 }}
                value={draftConseils}
                onChange={(e) => setDraftConseils(e.target.value)}
                onBlur={saveField}
              />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>
                {draftConseils || <span className="text-muted-foreground italic">Ajouter des conseils…</span>}
              </p>
            )}
          </EditableField>

          {/* Date de réception */}
          <EditableField
            label="DATE DE RÉCEPTION"
            editing={editingField === "date"}
            onStartEdit={() => setEditingField("date")}
          >
            {editingField === "date" ? (
              <input
                autoFocus
                type="date"
                className="text-sm text-card-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5"
                style={{ fontFamily: "DM Sans" }}
                value={draftDate}
                onChange={(e) => setDraftDate(e.target.value)}
                onBlur={saveField}
              />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>
                {draftDate
                  ? new Date(draftDate).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
                  : <span className="text-muted-foreground italic">Ajouter une date…</span>}
              </p>
            )}
          </EditableField>

          {!confirmDelete ? (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConfirmDelete(true)}
                className="bg-transparent text-[#E8736A] rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                Supprimer
              </button>
            </div>
          ) : (
            <div className="pt-2">
              <p className="text-sm text-[#E8736A] font-medium mb-2" style={{ fontFamily: "DM Sans" }}>
                Supprimer définitivement ?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => onDelete(id)}
                  className="bg-[#E8736A] text-white rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  Confirmer
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="bg-muted text-muted-foreground rounded-lg px-3 py-1.5 text-sm font-medium"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EditableField({ label, editing, onStartEdit, children }: { label: string; editing: boolean; onStartEdit: () => void; children: React.ReactNode }) {
  return (
    <div onClick={!editing ? onStartEdit : undefined} className={!editing ? "cursor-pointer" : ""}>
      <p className="text-[10px] font-semibold tracking-wide text-muted-foreground mb-0.5" style={{ fontFamily: "DM Sans", textTransform: "uppercase" as const }}>{label}</p>
      {children}
    </div>
  );
}
