import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, X } from "lucide-react";

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

interface IntervenantSearchPickerProps {
  enfantId: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}

// Stable gradient based on id
const GRADIENTS = [
  "linear-gradient(135deg, #E8736A, #E8845A)",
  "linear-gradient(135deg, #8B74E0, #5CA8D8)",
  "linear-gradient(135deg, #44A882, #4E96C8)",
  "linear-gradient(135deg, #E8A44A, #E8736A)",
  "linear-gradient(135deg, #E8736A, #C85A8A)",
  "linear-gradient(135deg, #8A9BAE, #6B7F94)",
  "linear-gradient(135deg, #44A882, #8B74E0)",
  "linear-gradient(135deg, #5CA8D8, #8B74E0)",
];

function getGradient(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function normalize(str: string): string {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const norm = normalize(text);
  const nq = normalize(query);
  const idx = norm.indexOf(nq);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: "#8B74E0", fontWeight: 600 }}>{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

export function IntervenantSearchPicker({ enfantId, value, onChange }: IntervenantSearchPickerProps) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch active intervenants
  useEffect(() => {
    if (!enfantId) { setLoading(false); return; }
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .eq("actif", true)
      .order("nom")
      .then(({ data }) => {
        setIntervenants(data || []);
        setLoading(false);
      });
  }, [enfantId]);

  // Fetch recent intervenant ids from memos
  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("memos")
      .select("intervenant_id, memo_date")
      .not("intervenant_id", "is", null)
      .not("enfant_id", "is", null)
      .order("memo_date", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (!data) return;
        const seen = new Set<string>();
        const ids: string[] = [];
        for (const m of data) {
          if (m.intervenant_id && !seen.has(m.intervenant_id)) {
            seen.add(m.intervenant_id);
            ids.push(m.intervenant_id);
            if (ids.length >= 3) break;
          }
        }
        setRecentIds(ids);
      });
  }, [enfantId]);

  const selectedIntervenant = useMemo(
    () => intervenants.find(i => i.id === value) || null,
    [intervenants, value]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = normalize(searchQuery);
    return intervenants.filter(i =>
      normalize(i.nom).includes(q) ||
      (i.specialite && normalize(i.specialite).includes(q))
    );
  }, [intervenants, searchQuery]);

  const recents = useMemo(() => {
    if (recentIds.length > 0) {
      return recentIds
        .map(id => intervenants.find(i => i.id === id))
        .filter(Boolean) as Intervenant[];
    }
    return intervenants.slice(0, 3);
  }, [recentIds, intervenants]);

  if (loading) {
    return <div className="text-sm text-muted-foreground animate-pulse">Chargement...</div>;
  }

  if (intervenants.length === 0) {
    return <p className="text-xs text-muted-foreground">Aucun intervenant enregistré.</p>;
  }

  const showResults = searchQuery.trim().length > 0;

  return (
    <div className="space-y-3">
      {/* Selected chip */}
      {selectedIntervenant && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
          style={{
            background: "rgba(139,116,224,0.08)",
            border: "1px solid rgba(139,116,224,0.25)",
          }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-semibold"
            style={{ width: 28, height: 28, background: getGradient(selectedIntervenant.id) }}
          >
            {selectedIntervenant.nom.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-foreground flex-1">
            {selectedIntervenant.nom}
            {selectedIntervenant.specialite && (
              <span className="text-muted-foreground font-normal"> · {selectedIntervenant.specialite}</span>
            )}
          </span>
          <button
            onClick={() => { onChange(null); setSearchQuery(""); }}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={selectedIntervenant ? "Changer d'intervenant…" : "Nom ou spécialité…"}
          className="w-full pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          style={{
            background: "rgba(255,255,255,0.45)",
            backdropFilter: "blur(12px) saturate(1.4)",
            WebkitBackdropFilter: "blur(12px) saturate(1.4)",
            border: "1px solid rgba(255,255,255,0.65)",
            borderRadius: 12,
            boxShadow: "0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7)",
          }}
        />
      </div>

      {/* Results or recents */}
      {showResults ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-1">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </p>
          {filtered.map(i => (
            <IntervenantRow
              key={i.id}
              intervenant={i}
              query={searchQuery}
              onSelect={() => { onChange(i.id); setSearchQuery(""); }}
            />
          ))}
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-3">Aucun résultat</p>
          )}
        </div>
      ) : !selectedIntervenant && recents.length > 0 ? (
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground px-1 font-medium" style={{ letterSpacing: "0.03em" }}>
            Récents
          </p>
          {recents.map(i => (
            <IntervenantRow
              key={i.id}
              intervenant={i}
              query=""
              onSelect={() => { onChange(i.id); setSearchQuery(""); }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function IntervenantRow({
  intervenant,
  query,
  onSelect,
}: {
  intervenant: Intervenant;
  query: string;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-white/40"
    >
      <div
        className="flex-shrink-0 flex items-center justify-center rounded-full text-white text-xs font-semibold"
        style={{ width: 32, height: 32, background: getGradient(intervenant.id) }}
      >
        {intervenant.nom.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{intervenant.nom}</p>
        {intervenant.specialite && (
          <p className="text-xs text-muted-foreground truncate">
            <HighlightMatch text={intervenant.specialite} query={query} />
          </p>
        )}
      </div>
    </button>
  );
}
