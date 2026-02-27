import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEnfantPrenom() {
  const { user } = useAuth();
  const [prenom, setPrenom] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("enfants")
      .select("prenom")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setPrenom(data.prenom);
      });
  }, [user]);

  return prenom;
}
