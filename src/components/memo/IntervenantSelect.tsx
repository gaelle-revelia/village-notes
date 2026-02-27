import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Intervenant {
  id: string;
  nom: string;
  specialite: string | null;
}

interface IntervenantSelectProps {
  enfantId: string | null;
  value: string | null;
  onChange: (id: string | null) => void;
}

export function IntervenantSelect({ enfantId, value, onChange }: IntervenantSelectProps) {
  const [intervenants, setIntervenants] = useState<Intervenant[]>([]);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("intervenants")
      .select("id, nom, specialite")
      .eq("enfant_id", enfantId)
      .then(({ data }) => {
        if (data) setIntervenants(data);
      });
  }, [enfantId]);

  if (intervenants.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <Label>Intervenant (optionnel)</Label>
      <Select
        value={value ?? "none"}
        onValueChange={(v) => onChange(v === "none" ? null : v)}
      >
        <SelectTrigger>
          <SelectValue placeholder="Aucun" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Aucun</SelectItem>
          {intervenants.map((i) => (
            <SelectItem key={i.id} value={i.id}>
              {i.nom}{i.specialite ? ` — ${i.specialite}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
