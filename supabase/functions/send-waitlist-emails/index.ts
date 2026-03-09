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
    const { email, prenom, nom, motivation, created_at } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const displayPrenom = prenom || "futur membre";
    const displayNom = nom || "";
    const displayMotivation = motivation || "(non renseigné)";
    const displayDate = created_at || new Date().toISOString();

    // Email 1 — confirmation to registrant
    const email1 = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Village <no-reply@the-village.app>",
        to: [email],
        subject: "Votre place est réservée dans le Village 🌱",
        html: `
          <div style="font-family: 'DM Sans', sans-serif; color: #1E1A1A; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; line-height: 1.6;">Bonjour ${displayPrenom},</p>
            <p style="font-size: 16px; line-height: 1.6;">Merci de rejoindre la liste d'attente de <strong>The Village</strong>.</p>
            <p style="font-size: 16px; line-height: 1.6;">Nous finalisons l'application avec soin — notamment sur la protection de vos données. Vous serez parmi les premiers informés dès l'ouverture.</p>
            <p style="font-size: 16px; line-height: 1.6;">À très vite,<br/>L'équipe The Village 🏡</p>
          </div>
        `,
      }),
    });

    // Email 2 — notification to Gaëlle
    const email2 = fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Village <no-reply@the-village.app>",
        to: ["gaelle@revelia-lab.fr"],
        subject: `🏡 Nouvelle inscription waitlist — ${displayPrenom} ${displayNom}`.trim(),
        html: `
          <div style="font-family: 'DM Sans', sans-serif; color: #1E1A1A; max-width: 520px; margin: 0 auto; padding: 32px 24px;">
            <p style="font-size: 16px; font-weight: 600;">Nouvelle inscription sur la waitlist.</p>
            <p style="font-size: 15px; line-height: 1.8;">
              <strong>Prénom :</strong> ${displayPrenom}<br/>
              <strong>Nom :</strong> ${displayNom || "(non renseigné)"}<br/>
              <strong>Email :</strong> ${email}<br/>
              <strong>Motivation :</strong> ${displayMotivation}<br/>
              <strong>Date :</strong> ${displayDate}
            </p>
          </div>
        `,
      }),
    });

    const [res1, res2] = await Promise.all([email1, email2]);

    // Consume bodies
    const body1 = await res1.text();
    const body2 = await res2.text();

    if (!res1.ok) {
      console.error("Email 1 failed:", res1.status, body1);
    }
    if (!res2.ok) {
      console.error("Email 2 failed:", res2.status, body2);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-waitlist-emails error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
