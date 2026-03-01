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
    // Verify caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { email, role, enfant_id, redirect_url } = await req.json();

    if (!email || !enfant_id) {
      return new Response(JSON.stringify({ error: "email and enfant_id are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for inviting
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check caller is owner or coparent of this enfant
    const { data: membership } = await supabaseAdmin
      .from("enfant_membres")
      .select("role")
      .eq("enfant_id", enfant_id)
      .eq("user_id", userId)
      .single();

    if (!membership || !["owner", "coparent"].includes(membership.role)) {
      return new Response(JSON.stringify({ error: "Not authorized to invite" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert invitation
    const { error: inviteDbError } = await supabaseAdmin
      .from("invitations")
      .insert({
        enfant_id,
        invited_by: userId,
        email,
        role: role || "coparent",
      });

    if (inviteDbError) {
      console.error("Insert invitation error:", inviteDbError);
      return new Response(JSON.stringify({ error: "Failed to create invitation" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Invite user via Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      data: { role: role || "coparent", enfant_id },
      redirectTo: redirect_url || undefined,
    });

    if (authError) {
      console.error("Auth invite error:", authError);

      // If user already exists, try to send a magic link instead
      if (authError.message?.includes("already been registered")) {
        // Look up existing user and link them directly
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        if (existingUser) {
          // Directly create enfant_membres link for this existing user
          const { error: linkError } = await supabaseAdmin
            .from("enfant_membres")
            .upsert(
              { enfant_id, user_id: existingUser.id, role: role || "coparent", invited_by: userId },
              { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
            );
          if (linkError) {
            console.error("Link existing user error:", linkError);
          } else {
            console.log("Existing user linked directly:", existingUser.id);
          }
        }

        // Send magic link so they can access the app
        const { error: magicError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: redirect_url || undefined },
        });
        if (magicError) {
          console.error("Magic link error:", magicError);
        }
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("invite-member error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
