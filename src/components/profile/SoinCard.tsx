import { useState } from "react";
import { ChevronRight, HeartPulse } from "lucide-react";

interface SoinCardProps {
  id: string;
  nom: string;
  description?: string | null;
  frequence?: string | null;
  instructions?: string | null;
  materiel?: string | null;
  signes_alerte?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SoinCard({
  id, nom, description, frequence, instructions, materiel, signes_alerte, onEdit, onDelete,
}: SoinCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className={`bg-white/72 backdrop-blur-[16px] border rounded-2xl p-4 mb-2.5 transition-all cursor-pointer ${
        expanded ? "border-[#44A882]" : "border-white/85"
      }`}
      onClick={() => { setExpanded((p) => !p); setConfirmDelete(false); }}
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
          {description && <DetailRow label="Description" value={description} />}
          {frequence && <DetailRow label="Fréquence" value={frequence} />}
          {materiel && <DetailRow label="Matériel" value={materiel} />}
          {instructions && <DetailRow label="Instructions" value={instructions} />}
          {signes_alerte && (
            <>
              <DetailRow label="Signes d'alerte" value={signes_alerte} />
              <div className="bg-[#FAECE7] text-[#E8736A] rounded-lg px-3 py-2 text-xs font-medium">
                ⚠ Protocole urgence
              </div>
            </>
          )}

          {!confirmDelete ? (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onEdit(id)}
                className="bg-[#E1F5EE] text-[#085041] rounded-lg px-3 py-1.5 text-sm font-medium"
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
