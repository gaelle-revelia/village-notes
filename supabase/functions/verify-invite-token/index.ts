import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { token, mark_used, provision_user, user_id, prenom, consent_at, consent_version } = await req.json();

    if (!token) {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: invitation, error } = await supabaseAdmin
      .from("invitations")
      .select("enfant_id, role, email, status, expires_at")
      .eq("token", token)
      .single();

    if (error || !invitation) {
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.status !== "pending") {
      return new Response(JSON.stringify({ error: "Invitation already used" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Invitation expired" }), {
        status: 410,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Provisioning mode: create profiles + enfant_membres server-side ---
    if (provision_user && user_id) {
      // 1. Upsert profiles
      const profileData: Record<string, unknown> = { user_id, onboarding_completed: false };
      if (prenom) profileData.prenom = prenom;
      if (consent_at) profileData.consent_at = consent_at;
      if (consent_version) profileData.consent_version = consent_version;

      const { error: profileErr } = await supabaseAdmin
        .from("profiles")
        .upsert(profileData, { onConflict: "user_id", ignoreDuplicates: false });

      if (profileErr) {
        console.error("profiles upsert error:", profileErr);
        return new Response(
          JSON.stringify({ error: "Failed to create profile", detail: profileErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 2. Upsert enfant_membres
      const { error: membreErr } = await supabaseAdmin
        .from("enfant_membres")
        .upsert(
          {
            enfant_id: invitation.enfant_id,
            user_id,
            role: invitation.role,
          },
          { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
        );

      if (membreErr) {
        console.error("enfant_membres upsert error:", membreErr);
        return new Response(
          JSON.stringify({ error: "Failed to create membership", detail: membreErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // 3. Mark token as used
      const { error: usedErr } = await supabaseAdmin
        .from("invitations")
        .update({ status: "used" })
        .eq("token", token);

      if (usedErr) {
        console.error("mark used error:", usedErr);
        return new Response(
          JSON.stringify({ error: "Failed to invalidate token", detail: usedErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          enfant_id: invitation.enfant_id,
          role: invitation.role,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Legacy mode: just validate + optionally mark used ---
    if (mark_used) {
      await supabaseAdmin
        .from("invitations")
        .update({ status: "used" })
        .eq("token", token);
    }

    return new Response(
      JSON.stringify({
        enfant_id: invitation.enfant_id,
        role: invitation.role,
        email: invitation.email,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("verify-invite-token error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
