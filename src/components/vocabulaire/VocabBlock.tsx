import { useState, useRef, useEffect } from "react";
import { Pencil, X, Plus } from "lucide-react";

interface VocabBlockProps {
  motCorrect: string;
  variantes: {id: string;mot_transcrit: string;}[];
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onRename: (oldName: string, newName: string) => Promise<void>;
  onRemoveBlock: () => void;
  onRemoveVariant: (id: string) => void;
  onAddVariant: (motTranscrit: string) => void;
}

export function VocabBlock({
  motCorrect,
  variantes,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onRename,
  onRemoveBlock,
  onRemoveVariant,
  onAddVariant
}: VocabBlockProps) {
  const [editValue, setEditValue] = useState(motCorrect);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [newVariant, setNewVariant] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const MAX_COLLAPSED = 3;
  const displayedVariantes = isEditing ? variantes : variantes.slice(0, MAX_COLLAPSED);
  const hasMore = variantes.length > MAX_COLLAPSED;

  useEffect(() => {
    if (isEditing) {
      setEditValue(motCorrect);
      setConfirmDelete(false);
      setNewVariant("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isEditing, motCorrect]);

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === motCorrect) {
      onCancelEdit();
      return;
    }
    setSaving(true);
    await onRename(motCorrect, trimmed);
    setSaving(false);
    onCancelEdit();
  };

  const handleAddVariant = () => {
    const v = newVariant.trim();
    if (!v) return;
    onAddVariant(v);
    setNewVariant("");
  };

  // Delete confirmation state
  if (confirmDelete) {
    return (
      <div
        className="rounded-2xl px-4 py-3 space-y-2"
        style={{
          background: "rgba(255,255,255,0.7)",
          backdropFilter: "blur(16px) saturate(1.6)",
          border: "1px solid rgba(232,115,106,0.3)"
        }}>

        <p className="text-xs font-medium" style={{ fontFamily: "DM Sans", color: "#1a1512" }}>
          Supprimer ce mot et toutes ses variantes ?
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => {setConfirmDelete(false);onRemoveBlock();}}
            className="text-xs font-medium px-3 py-1 rounded-full text-white"
            style={{ background: "#E8736A", fontFamily: "DM Sans" }}>

            Confirmer
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="text-xs font-medium px-3 py-1 rounded-full"
            style={{ background: "rgba(0,0,0,0.05)", color: "#1a1512", fontFamily: "DM Sans" }}>

            Annuler
          </button>
        </div>
      </div>);

  }

  return (
    <div
      className="rounded-2xl px-4 py-3 space-y-2 transition-shadow duration-200"
      style={{
        background: "rgba(255,255,255,0.7)",
        backdropFilter: "blur(16px) saturate(1.6)",
        border: isEditing ? "1px solid rgba(160,130,100,0.25)" : "1px solid rgba(255,255,255,0.85)",
        boxShadow: isEditing ?
        "0 0 0 3px rgba(160,130,100,0.12), 0 4px 24px rgba(139,116,224,0.08)" :
        "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
        cursor: isEditing ? "default" : "pointer"
      }}
      onClick={() => {if (!isEditing) onStartEdit();}}>

      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {isEditing ?
        <div className="flex items-center gap-2 flex-1 min-w-0">
            <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-base font-bold outline-none border-b border-[rgba(160,130,100,0.3)] pb-0.5"
            style={{ fontFamily: "Georgia, serif", color: "#1a1512" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {e.preventDefault();handleSave();}
              if (e.key === "Escape") onCancelEdit();
            }} />

            <button
            onClick={(e) => {e.stopPropagation();handleSave();}}
            disabled={saving || !editValue.trim()}
            className="text-xs font-medium px-3 py-1 rounded-full text-white shrink-0 disabled:opacity-50"
            style={{ background: "#1a1512", fontFamily: "DM Sans" }}>

              Sauvegarder
            </button>
            <button
            onClick={(e) => {e.stopPropagation();onCancelEdit();}}
            className="text-xs font-medium px-2 py-1 rounded-full shrink-0"
            style={{ background: "rgba(0,0,0,0.05)", color: "#1a1512", fontFamily: "DM Sans" }}>

              ✕
            </button>
          </div> :

        <>
            <span className="text-base font-bold" style={{ fontFamily: "Georgia, serif", color: "#1a1512" }}>
              {motCorrect}
            </span>
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
              onClick={() => onStartEdit()}
              className="p-1 transition-colors"
              style={{ color: "#9A9490" }}
              aria-label="Modifier">

                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
              onClick={() => setConfirmDelete(true)}
              className="p-1 transition-colors hover:text-destructive"
              style={{ color: "#9A9490" }}
              aria-label="Supprimer">

                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </>
        }
      </div>

      {/* Variant pills */}
      <div className="flex flex-wrap gap-1.5">
        {displayedVariantes.map((v) =>
        <span
          key={v.id}
          className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs"
          style={{
            background: "rgba(0,0,0,0.05)",
            borderRadius: "20px",
            fontFamily: "DM Sans",
            color: "#1a1512"
          }}>

            {v.mot_transcrit}
            {isEditing &&
          <button
            onClick={(e) => {e.stopPropagation();onRemoveVariant(v.id);}}
            className="ml-0.5 hover:text-destructive transition-colors"
            style={{ color: "#9A9490" }}>

                <X className="h-2.5 w-2.5" />
              </button>
          }
          </span>
        )}
        {!isEditing && hasMore &&
        <span className="text-xs py-0.5" style={{ color: "#9A9490", fontFamily: "DM Sans" }}>
            +{variantes.length - MAX_COLLAPSED} autres
          </span>
        }
      </div>

      {/* Add variant (edit mode only) */}
      {isEditing &&
      <div className="flex items-center gap-2 pt-1">
          <input
          value={newVariant}
          onChange={(e) => setNewVariant(e.target.value)}
          placeholder="Ajouter une variante…"
          className="flex-1 min-w-0 bg-transparent text-xs outline-none border-b border-[rgba(160,130,100,0.2)] pb-0.5"
          style={{ fontFamily: "DM Sans", color: "#1a1512" }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {e.preventDefault();handleAddVariant();}
          }} />

          <button
          onClick={(e) => {e.stopPropagation();handleAddVariant();}}
          disabled={!newVariant.trim()}
          className="p-0.5 disabled:opacity-30 transition-colors"
          style={{ color: "#8B74E0" }}>

            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      }
    </div>);

}