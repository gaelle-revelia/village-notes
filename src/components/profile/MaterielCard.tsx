import { useState } from "react";
import { ChevronRight, Wrench } from "lucide-react";

interface MaterielCardProps {
  id: string;
  nom: string;
  conseils?: string | null;
  date_reception?: string | null;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function MaterielCard({
  id, nom, conseils, date_reception, onEdit, onDelete,
}: MaterielCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div
      className="rounded-2xl p-4 mb-2.5 transition-all cursor-pointer"
      style={{ background: "rgba(255,255,255,0.55)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.72)", boxShadow: "0 2px 12px rgba(232,164,74,0.06)" }}
      onClick={() => { setExpanded((p) => !p); setConfirmDelete(false); }}
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
          {conseils && <DetailRow label="Conseils d'utilisation" value={conseils} />}
          {date_reception && (
            <DetailRow
              label="Date de réception"
              value={new Date(date_reception).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            />
          )}

          {!confirmDelete ? (
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onEdit(id)}
                className="bg-[#FAEEDA] text-[#92560A] rounded-lg px-3 py-1.5 text-sm font-medium"
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
