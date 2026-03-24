import { useState } from "react";
import { ChevronRight, Pill } from "lucide-react";

interface MedicamentCardProps {
  id: string;
  nom: string;
  dosage?: string | null;
  voie?: string | null;
  frequence?: string | null;
  instructions?: string | null;
  conditions?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MedicamentCard({
  id, nom, dosage, voie, frequence, instructions, conditions, onEdit, onDelete,
}: MedicamentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const subtitle = [voie, frequence].filter(Boolean).join(" · ");

  return (
    <div
      className={`rounded-2xl p-4 mb-2.5 transition-all cursor-pointer ${
        expanded ? "border-[#AFA9EC]" : ""
      }`}
      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: expanded ? undefined : "1px solid rgba(255,255,255,0.72)", boxShadow: "0 2px 12px rgba(139,116,224,0.06)" }}
      onClick={() => { setExpanded((p) => !p); setConfirmDelete(false); }}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="bg-[#EEEDFE] rounded-[10px] w-9 h-9 flex items-center justify-center shrink-0">
          <Pill className="h-4 w-4 text-[#534AB7]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-card-foreground text-[15px] truncate" style={{ fontFamily: "DM Sans" }}>
            {nom}
          </p>
          {subtitle && (
            <p className="text-muted-foreground text-xs truncate" style={{ fontFamily: "DM Sans" }}>
              {subtitle}
            </p>
          )}
        </div>
        <ChevronRight
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
            expanded ? "rotate-90" : ""
          }`}
        />
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="mt-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          {dosage && (
            <DetailRow label="Dosage" value={dosage} />
          )}
          {voie && (
            <div>
              <p className="text-xs text-muted-foreground mb-1" style={{ fontFamily: "DM Sans" }}>Voie</p>
              <span className="inline-block bg-[#EEEDFE] text-[#534AB7] rounded-full px-2.5 py-1 text-xs font-medium">
                {voie}
              </span>
            </div>
          )}
          {frequence && (
            <div>
              <p className="text-xs text-muted-foreground mb-1" style={{ fontFamily: "DM Sans" }}>Fréquence</p>
              <div className="flex flex-wrap gap-1.5">
                {frequence.split(", ").map((f) => (
                  <span key={f} className="inline-block bg-[#FAEEDA] text-[#633806] rounded-full px-2.5 py-1 text-xs font-medium">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          )}
          {instructions && (
            <DetailRow label="Instructions" value={instructions} />
          )}
          {conditions && (
            <DetailRow label="Conditions" value={conditions} />
          )}

          {/* Actions */}
          {!confirmDelete ? (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onEdit(id)}
                className="bg-[#EEEDFE] text-[#534AB7] rounded-lg px-3 py-1.5 text-sm font-medium"
              >
                Modifier
              </button>
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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground mb-0.5" style={{ fontFamily: "DM Sans" }}>{label}</p>
      <p className="text-sm text-card-foreground" style={{ fontFamily: "DM Sans" }}>{value}</p>
    </div>
  );
}
