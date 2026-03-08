import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

serve(async (req) => {
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

    const { enfant_id, axes } = await req.json();

    if (!enfant_id || !axes || !Array.isArray(axes) || axes.length === 0) {
      return new Response(JSON.stringify({ error: "Missing enfant_id or axes" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Check enfant exists and backfill_done
    const { data: enfant, error: enfantError } = await supabase
      .from("enfants")
      .select("id, backfill_done")
      .eq("id", enfant_id)
      .single();

    if (enfantError || !enfant) {
      return new Response(JSON.stringify({ error: "Enfant not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (enfant.backfill_done) {
      return new Response(JSON.stringify({ pepites_created: 0, skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch all done memos
    const { data: memos, error: memosError } = await supabase
      .from("memos")
      .select("id, content_structured")
      .eq("enfant_id", enfant_id)
      .eq("processing_status", "done");

    if (memosError) {
      console.error("Error fetching memos:", memosError);
      return new Response(JSON.stringify({ error: "Failed to fetch memos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const axesFormatted = axes.map((a: { id: string; label: string }) => `- ID: ${a.id} | Label: ${a.label}`).join("\n");

    let pepitesCreated = 0;

    // 3. Process each memo
    for (const memo of memos || []) {
      try {
        const resume = (memo.content_structured as any)?.resume;
        if (!resume) continue;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content: "Tu es un assistant spécialisé. Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaire.",
              },
              {
                role: "user",
                content: `Tu analyses un mémo parental d'un enfant en situation de handicap.

Résumé du mémo : '${resume}'

Axes actifs :
${axesFormatted}

Réponds UNIQUEMENT avec un JSON valide sans markdown :
{ "axe_ids": ["uuid"] }

0, 1 ou 2 axe_ids maximum. [] si aucun lien évident.
Interdit : pronostic, diagnostic, comparaison à des normes.`,
              },
            ],
            max_tokens: 500,
          }),
        });

        if (!response.ok) {
          console.error(`AI error for memo ${memo.id}: status ${response.status}`);
          await response.text(); // consume body
          continue;
        }

        const data = await response.json();
        const raw = (data.choices?.[0]?.message?.content ?? "").trim();

        let parsed;
        try {
          parsed = JSON.parse(raw);
        } catch {
          console.error(`Failed to parse AI response for memo ${memo.id}:`, raw);
          continue;
        }

        const axeIds: string[] = parsed.axe_ids || [];
        const validAxeIds = axeIds.filter((id: string) => axes.some((a: { id: string }) => a.id === id));

        for (const axeId of validAxeIds.slice(0, 2)) {
          const { error: insertError } = await supabase
            .from("pepites")
            .insert({ memo_id: memo.id, axe_id: axeId });

          if (insertError) {
            // ON CONFLICT duplicate → ignore
            if (insertError.code === "23505") continue;
            console.error(`Insert error for memo ${memo.id}, axe ${axeId}:`, insertError);
          } else {
            pepitesCreated++;
          }
        }
      } catch (e) {
        console.error(`Error processing memo ${memo.id}:`, e);
        continue;
      }
    }

    // 4. Mark backfill done
    const { error: updateError } = await supabase
      .from("enfants")
      .update({ backfill_done: true })
      .eq("id", enfant_id);

    if (updateError) {
      console.error("Failed to set backfill_done:", updateError);
    }

    return new Response(JSON.stringify({ pepites_created: pepitesCreated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("backfill-pepites error:", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
