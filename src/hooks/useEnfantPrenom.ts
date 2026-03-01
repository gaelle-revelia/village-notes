import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useEnfantId } from "@/hooks/useEnfantId";

export function useEnfantPrenom() {
  const { enfantId } = useEnfantId();
  const [prenom, setPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!enfantId) return;
    supabase
      .from("enfants")
      .select("prenom")
      .eq("id", enfantId)
      .single()
      .then(({ data }) => {
        if (data) setPrenom(data.prenom);
      });
  }, [enfantId]);

  return prenom;
}
