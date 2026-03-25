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

interface Block {
  title: string;
  cerfa_ref: string;
  content: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\n/g, "<br/>");
}

function buildBlockHtml(block: Block): string {
  return `
    <div style="padding: 24px 32px;">
      <div style="border-left: 3px solid #8B74E0; padding-left: 14px; margin-bottom: 14px;">
        <p style="font-size: 14px; font-weight: 700; color: #1E1A1A; margin: 0 0 2px;">
          ${escapeHtml(block.title)}
        </p>
        ${block.cerfa_ref ? `<p style="font-size: 11px; color: #8B74E0; margin: 0; font-weight: 500;">${escapeHtml(block.cerfa_ref)}</p>` : ""}
      </div>
      <div style="background: #F9F8F7; border-radius: 10px; padding: 16px 18px;">
        <p style="font-size: 13px; color: #1E1A1A; line-height: 1.7; margin: 0;">
          ${escapeHtml(block.content)}
        </p>
      </div>
    </div>
    <div style="height: 1px; background: #F0EDF0; margin: 0 32px;"></div>`;
}

function buildEmailHtml(
  parentPrenom: string,
  enfantPrenom: string,
  syntheseDate: string,
  typeDemande: string,
  blocks: Block[],
): string {
  const blocksHtml = blocks.map(buildBlockHtml).join("\n");

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
<body style="margin:0; padding:0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background:#ffffff;">

  <!-- HEADER -->
  <div style="background: linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%); padding: 28px 32px;">
    <p style="font-size: 11px; color: #8B74E0; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 600; margin: 0 0 8px;">
      The Village
    </p>
    <h1 style="font-size: 22px; font-weight: 600; color: #1E1A1A; margin: 0 0 6px; font-family: Georgia, 'Times New Roman', serif;">
      Dossier MDPH — ${escapeHtml(enfantPrenom)}
    </h1>
    <p style="font-size: 13px; color: #9A9490; margin: 0;">
      Généré le ${escapeHtml(syntheseDate)} · ${escapeHtml(typeDemande)}
    </p>
  </div>

  <!-- INTRO -->
  <div style="padding: 24px 32px 0;">
    <p style="font-size: 14px; color: #1E1A1A; line-height: 1.6; margin: 0 0 8px;">
      Bonjour ${escapeHtml(parentPrenom)},
    </p>
    <p style="font-size: 14px; color: #1E1A1A; line-height: 1.6; margin: 0;">
      Voici les textes générés pour le dossier MDPH de ${escapeHtml(enfantPrenom)}.
      Copie chaque bloc dans la section correspondante du formulaire CERFA,
      puis ajuste si besoin.
    </p>
  </div>

  <div style="height: 1px; background: #F0EDF0; margin: 20px 32px 0;"></div>

  <!-- BLOCKS -->
  ${blocksHtml}

  <!-- FOOTER -->
  <div style="background: #F9F8F7; padding: 20px 32px; text-align: center;">
    <p style="font-size: 11px; color: #9A9490; line-height: 1.6; margin: 0;">
      Ce document est une synthèse des observations parentales générée par
      The Village à partir des données de suivi. Il ne constitue pas un document
      médical ni un bilan professionnel. Les textes sont à titre d'aide à la
      rédaction — à relire et adapter avant insertion dans le formulaire officiel.
    </p>
  </div>

</body>
</html>`;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, parentPrenom, enfantPrenom, syntheseDate, typeDemande, blocks } = await req.json();

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

    const html = buildEmailHtml(
      parentPrenom || "Parent",
      enfantPrenom || "Enfant",
      syntheseDate || new Date().toLocaleDateString("fr-FR"),
      typeDemande || "Dossier MDPH",
      blocks || [],
    );

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "The Village <no-reply@the-village.app>",
        to: [email],
        subject: `Dossier MDPH — ${enfantPrenom || "Enfant"} · ${syntheseDate || ""}`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errBody = await resendRes.text();
      console.error("Resend error:", errBody);
      throw new Error(`Resend returned ${resendRes.status}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-mdph-email error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
