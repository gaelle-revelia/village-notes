import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEnfantId() {
  const { user } = useAuth();
  const [enfantId, setEnfantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("enfant_membres" as any)
      .select("enfant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }: any) => {
        if (data) {
          setEnfantId(data.enfant_id);
          setRole(data.role);
        }
        setLoading(false);
      });
  }, [user]);

  return { enfantId, role, loading };
}
