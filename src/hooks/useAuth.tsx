import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Auto-link invited users to enfant_membres
        if (_event === "SIGNED_IN" && session?.user) {
          const meta = session.user.user_metadata;
          const enfantId = meta?.enfant_id;
          const role = meta?.role;
          if (enfantId && role) {
            const { error } = await supabase
              .from("enfant_membres")
              .upsert(
                {
                  enfant_id: enfantId,
                  user_id: session.user.id,
                  role: role,
                },
                { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
              );
            if (!error) {
              await supabase.auth.updateUser({
                data: { enfant_id: null, role: null },
              });
              // Redirect to invite onboarding if not already done
              if (localStorage.getItem("onboarding_invite_done") !== "true") {
                localStorage.setItem("invite_enfant_id", enfantId);
                localStorage.setItem("invite_role", role);
                window.location.href = "/onboarding-invite";
              }
            }
          }
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
