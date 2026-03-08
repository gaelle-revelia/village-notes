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
    const { token, mark_used, user_id } = await req.json();
    console.log("[verify-invite] received:", JSON.stringify({ token, mark_used, user_id }));

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

    // If mark_used is true, provision user and invalidate the token
    if (mark_used) {
      if (user_id) {
        const { error: membresErr } = await supabaseAdmin.from("enfant_membres").upsert(
          {
            enfant_id: invitation.enfant_id,
            user_id,
            role: invitation.role,
            joined_at: new Date().toISOString(),
          },
          { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
        );
        console.log("[verify-invite] enfant_membres result:", membresErr);
        if (membresErr) {
          console.error("enfant_membres upsert failed:", membresErr);
          return new Response(JSON.stringify({ error: "Failed to provision membership" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(
          {
            user_id,
            prenom: "",
            onboarding_completed: true,
            consent_version: "v1.0",
            consent_at: new Date().toISOString(),
          },
          { onConflict: "user_id", ignoreDuplicates: true }
        );
        if (profileErr) {
          console.error("profiles upsert failed:", profileErr);
          return new Response(JSON.stringify({ error: "Failed to provision profile" }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

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
