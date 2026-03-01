import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processInviteIfNeeded = async (activeSession: Session | null) => {
      if (!activeSession?.user) return;
      if (localStorage.getItem('invite_pending') === 'true') return;

      const meta = activeSession.user.user_metadata;
      const enfantId = meta?.enfant_id;
      const role = meta?.role;
      if (!enfantId || !role) return;

      const { error } = await supabase
        .from("enfant_membres")
        .upsert(
          { enfant_id: enfantId, user_id: activeSession.user.id, role },
          { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
        );

      if (error) {
        console.error("Invite link error:", error);
        return;
      }

      await supabase.auth.updateUser({ data: { enfant_id: null, role: null } });

      localStorage.setItem("invite_enfant_id", enfantId);
      localStorage.setItem("invite_role", role);
      localStorage.setItem("invite_pending", "true");
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === "SIGNED_IN") {
          await processInviteIfNeeded(session);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
