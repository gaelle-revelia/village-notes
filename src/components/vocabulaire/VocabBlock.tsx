import { useState } from "react";
import { Pencil, X, ChevronDown, ChevronUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface VocabBlockProps {
  motCorrect: string;
  variantes: string[];
  onRename?: (oldName: string, newName: string) => Promise<void>;
  onRemoveBlock?: () => void;
}

export function VocabBlock({ motCorrect, variantes, onRename, onRemoveBlock }: VocabBlockProps) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(motCorrect);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const MAX_COLLAPSED = 3;
  const displayedVariantes = expanded ? variantes : variantes.slice(0, MAX_COLLAPSED);
  const hasMore = variantes.length > MAX_COLLAPSED;

  const handleSave = async () => {
    const trimmed = editValue.trim();
    if (!trimmed || trimmed === motCorrect) {
      setEditing(false);
      setEditValue(motCorrect);
      return;
    }
    setSaving(true);
    await onRename?.(motCorrect, trimmed);
    setSaving(false);
    setEditing(false);
  };

  return (
    <div
      className="rounded-2xl px-4 py-3 space-y-2"
      style={{
        background: "rgba(255,255,255,0.38)",
        backdropFilter: "blur(16px) saturate(1.6)",
        border: "1px solid rgba(255,255,255,0.85)",
        boxShadow: "0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="h-8 rounded-lg text-sm font-semibold flex-1"
              style={{ fontFamily: "DM Sans" }}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); handleSave(); }
                if (e.key === "Escape") { setEditing(false); setEditValue(motCorrect); }
              }}
            />
            <Button
              onClick={handleSave}
              disabled={saving || !editValue.trim()}
              size="sm"
              className="h-7 rounded-lg text-xs px-3"
              style={{ background: "linear-gradient(135deg, #E8736A, #8B74E0)" }}
            >
              Sauver
            </Button>
          </div>
        ) : (
          <span className="text-sm font-semibold text-card-foreground" style={{ fontFamily: "DM Sans" }}>
            {motCorrect}
          </span>
        )}

        {!editing && (
          <div className="flex items-center gap-1 shrink-0">
            {onRename && (
              <button
                onClick={() => { setEditing(true); setEditValue(motCorrect); }}
                className="text-muted-foreground hover:text-foreground p-1 transition-colors"
                aria-label="Modifier"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {onRemoveBlock && !confirmDelete && (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-muted-foreground hover:text-destructive p-1 transition-colors"
                aria-label="Supprimer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2" style={{ background: "rgba(232,115,106,0.08)", border: "1px solid rgba(232,115,106,0.2)" }}>
          <span className="text-xs font-medium text-destructive" style={{ fontFamily: "DM Sans" }}>
            Supprimer ce mot ?
          </span>
          <div className="flex gap-1.5">
            <Button
              onClick={() => { setConfirmDelete(false); onRemoveBlock?.(); }}
              size="sm"
              variant="destructive"
              className="h-6 rounded-md text-xs px-2"
            >
              Oui
            </Button>
            <Button
              onClick={() => setConfirmDelete(false)}
              size="sm"
              variant="ghost"
              className="h-6 rounded-md text-xs px-2"
            >
              Non
            </Button>
          </div>
        </div>
      )}

      {/* Variant pills (read-only) */}
      <div className="flex flex-wrap gap-1.5">
        {displayedVariantes.map((v) => (
          <span
            key={v}
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs text-muted-foreground"
            style={{
              background: "rgba(139,116,224,0.1)",
              border: "1px solid rgba(139,116,224,0.15)",
              fontFamily: "DM Sans",
            }}
          >
            {v}
          </span>
        ))}
      </div>

      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {expanded ? "Moins" : `+${variantes.length - MAX_COLLAPSED} variantes`}
        </button>
      )}
    </div>
  );
}
