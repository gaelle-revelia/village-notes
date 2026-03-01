import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isProcessingInvite = false;

    const processInviteIfNeeded = async (activeSession: Session | null) => {
      if (!activeSession?.user || isProcessingInvite) return;

      const meta = activeSession.user.user_metadata;
      const enfantId = meta?.enfant_id;
      const role = meta?.role;
      if (!enfantId || !role) return;

      isProcessingInvite = true;

      const { error } = await supabase
        .from("enfant_membres")
        .upsert(
          {
            enfant_id: enfantId,
            user_id: activeSession.user.id,
            role,
          },
          { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
        );

      if (error) {
        console.error("Invite link error:", error);
        isProcessingInvite = false;
        return;
      }

      await supabase.auth.updateUser({
        data: { enfant_id: null, role: null },
      });

      localStorage.setItem("invite_enfant_id", enfantId);
      localStorage.setItem("invite_role", role);

      if (window.location.pathname !== "/onboarding-invite") {
        window.location.replace("/onboarding-invite");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (["SIGNED_IN", "INITIAL_SESSION", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) {
          await processInviteIfNeeded(session);
        }
      }
    );

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      await processInviteIfNeeded(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
