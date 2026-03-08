import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const allowedOrigins = [
  "https://the-village.app",
  "https://thevillage-app.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify caller
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userError,
    } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check role — owners cannot delete themselves
    const { data: membership } = await supabaseAdmin
      .from("enfant_membres")
      .select("role")
      .eq("user_id", userId)
      .limit(1)
      .single();

    if (membership?.role === "owner") {
      return new Response(
        JSON.stringify({ error: "Les responsables du village ne peuvent pas supprimer leur accès." }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Fetch prenom before deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("prenom")
      .eq("user_id", userId)
      .single();

    const prenom = profile?.prenom || "là";
    const userEmail = user.email;

    // Send confirmation email via Resend (non-blocking)
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (RESEND_API_KEY && userEmail) {
      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "The Village <contact@the-village.app>",
            to: [userEmail],
            subject: "Votre accès à The Village a été supprimé",
            text: `Bonjour ${prenom},\n\nVotre accès au village a bien été supprimé.\nVos souvenirs partagés restent accessibles aux autres membres du village.\n\nSi vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement à contact@the-village.app\n\nL'équipe The Village`,
          }),
        });
        if (!resendRes.ok) {
          console.error("Resend delete-confirmation error:", resendRes.status, await resendRes.text());
        }
      } catch (emailErr) {
        console.error("Failed to send delete confirmation email:", emailErr);
      }
    } else {
      console.warn("Skipping delete confirmation email: missing RESEND_API_KEY or user email");
    }

    // Delete enfant_membres row
    await supabaseAdmin
      .from("enfant_membres")
      .delete()
      .eq("user_id", userId);

    // Delete profiles row
    await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", userId);

    // Delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: "Failed to delete account" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("delete-account error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
