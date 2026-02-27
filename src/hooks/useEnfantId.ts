import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEnfantId() {
  const { user } = useAuth();
  const [enfantId, setEnfantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("enfants")
      .select("id")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setEnfantId(data.id);
        setLoading(false);
      });
  }, [user]);

  return { enfantId, loading };
}
