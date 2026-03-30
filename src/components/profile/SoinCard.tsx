import { useState } from "react";
import { ChevronRight, HeartPulse } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface SoinCardProps {
  id: string;
  nom: string;
  description?: string | null;
  frequence?: string | null;
  instructions?: string | null;
  materiel?: string | null;
  signes_alerte?: string | null;
  onEdit: (id: string, data: { nom: string; description?: string; frequence?: string; instructions?: string; materiel?: string; signes_alerte?: string }) => void;
  onDelete: (id: string) => void;
}

export function SoinCard({
  id, nom, description, frequence, instructions, materiel, signes_alerte, onEdit, onDelete,
}: SoinCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [draftNom, setDraftNom] = useState(nom);
  const [draftDescription, setDraftDescription] = useState(description || "");
  const [draftFrequence, setDraftFrequence] = useState(frequence || "");
  const [draftInstructions, setDraftInstructions] = useState(instructions || "");
  const [draftMateriel, setDraftMateriel] = useState(materiel || "");
  const [draftSignesAlerte, setDraftSignesAlerte] = useState(signes_alerte || "");

  const saveField = () => {
    if (!draftNom.trim()) {
      setDraftNom(nom);
      setEditingField(null);
      return;
    }
    onEdit(id, {
      nom: draftNom.trim(),
      description: draftDescription || undefined,
      frequence: draftFrequence || undefined,
      instructions: draftInstructions || undefined,
      materiel: draftMateriel || undefined,
      signes_alerte: draftSignesAlerte || undefined,
    });
    setEditingField(null);
  };

  return (
    <div
      className="rounded-2xl p-4 mb-2.5 transition-all cursor-pointer"
      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 2px 12px rgba(68,168,130,0.06)" }}
      onClick={() => { setExpanded((p) => !p); setConfirmDelete(false); setEditingField(null); }}
    >
      <div className="flex items-center gap-3">
        <div className="bg-[#E1F5EE] rounded-[10px] w-9 h-9 flex items-center justify-center shrink-0">
          <HeartPulse className="h-4 w-4 text-[#085041]" />
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
          <EditableField label="NOM" editing={editingField === "nom"} onStartEdit={() => setEditingField("nom")}>
            {editingField === "nom" ? (
              <input autoFocus className="w-full text-sm text-card-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5" style={{ fontFamily: "DM Sans" }} value={draftNom} onChange={(e) => setDraftNom(e.target.value)} onBlur={saveField} onKeyDown={(e) => e.key === "Enter" && saveField()} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftNom}</p>
            )}
          </EditableField>

          <EditableField label="DESCRIPTION" editing={editingField === "description"} onStartEdit={() => setEditingField("description")}>
            {editingField === "description" ? (
              <Textarea autoFocus autoResize className="w-full text-sm text-card-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1" style={{ fontFamily: "DM Sans", minHeight: 40 }} value={draftDescription} onChange={(e) => setDraftDescription(e.target.value)} onBlur={saveField} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftDescription || <span className="text-muted-foreground italic">Ajouter une description…</span>}</p>
            )}
          </EditableField>

          <EditableField label="FRÉQUENCE" editing={editingField === "frequence"} onStartEdit={() => setEditingField("frequence")}>
            {editingField === "frequence" ? (
              <input autoFocus className="w-full text-sm text-card-foreground bg-transparent border-b border-muted-foreground/30 outline-none py-0.5" style={{ fontFamily: "DM Sans" }} value={draftFrequence} onChange={(e) => setDraftFrequence(e.target.value)} onBlur={saveField} onKeyDown={(e) => e.key === "Enter" && saveField()} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftFrequence || <span className="text-muted-foreground italic">Ajouter une fréquence…</span>}</p>
            )}
          </EditableField>

          <EditableField label="INSTRUCTIONS" editing={editingField === "instructions"} onStartEdit={() => setEditingField("instructions")}>
            {editingField === "instructions" ? (
              <Textarea autoFocus autoResize className="w-full text-sm text-card-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1" style={{ fontFamily: "DM Sans", minHeight: 40 }} value={draftInstructions} onChange={(e) => setDraftInstructions(e.target.value)} onBlur={saveField} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftInstructions || <span className="text-muted-foreground italic">Ajouter des instructions…</span>}</p>
            )}
          </EditableField>

          <EditableField label="MATÉRIEL NÉCESSAIRE" editing={editingField === "materiel"} onStartEdit={() => setEditingField("materiel")}>
            {editingField === "materiel" ? (
              <Textarea autoFocus autoResize className="w-full text-sm text-card-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1" style={{ fontFamily: "DM Sans", minHeight: 40 }} value={draftMateriel} onChange={(e) => setDraftMateriel(e.target.value)} onBlur={saveField} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftMateriel || <span className="text-muted-foreground italic">Ajouter du matériel…</span>}</p>
            )}
          </EditableField>

          <EditableField label="SIGNES D'ALERTE" editing={editingField === "signes_alerte"} onStartEdit={() => setEditingField("signes_alerte")}>
            {editingField === "signes_alerte" ? (
              <Textarea autoFocus autoResize className="w-full text-sm text-card-foreground bg-transparent border border-muted-foreground/30 outline-none rounded-md px-2 py-1" style={{ fontFamily: "DM Sans", minHeight: 40 }} value={draftSignesAlerte} onChange={(e) => setDraftSignesAlerte(e.target.value)} onBlur={saveField} />
            ) : (
              <p className="text-sm text-card-foreground cursor-pointer" style={{ fontFamily: "DM Sans" }}>{draftSignesAlerte || <span className="text-muted-foreground italic">Ajouter des signes d'alerte…</span>}</p>
            )}
          </EditableField>

          {draftSignesAlerte && (
            <div className="bg-[#FAECE7] text-[#E8736A] rounded-lg px-3 py-2 text-xs font-medium">
              ⚠ Protocole urgence
            </div>
          )}

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
