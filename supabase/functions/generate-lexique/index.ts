import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un assistant qui génère des variantes phonétiques pour améliorer la transcription vocale automatique en français. Retourne UNIQUEMENT un tableau JSON valide, sans markdown, sans commentaire, sans texte autour.`;

serve(async (req) => {
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

    const body = await req.json();
    const { prenom_enfant, intervenants = [], mots } = body;

    // Validation: at least one mode must be provided
    if (!prenom_enfant && (!mots || !Array.isArray(mots) || mots.length === 0)) {
      return new Response(
        JSON.stringify({ error: "prenom_enfant or mots[] required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    let userPrompt: string;

    if (mots && Array.isArray(mots) && mots.length > 0) {
      // Manual mode
      userPrompt = `Voici une liste de mots ou noms propres utilisés dans le contexte médico-thérapeutique d'un enfant. Pour chaque terme, génère 2 à 3 variantes phonétiques probables telles qu'un moteur de transcription vocale française pourrait les produire incorrectement. Inclus les variantes avec et sans accents, les erreurs de découpage syllabique, les homophonies courantes. Mots : ${JSON.stringify(mots)}. Format de réponse : [{ "mot_transcrit": "variante incorrecte", "mot_correct": "terme exact", "source": "manual" }]`;
    } else {
      // Onboarding mode
      userPrompt = `Voici le prénom d'un enfant et une liste d'intervenants avec leur structure. Pour chaque terme propre (prénom, nom, structure/lieu), génère 2 à 3 variantes phonétiques probables telles qu'un moteur de transcription vocale française pourrait les produire incorrectement. Inclus les variantes avec et sans accents, les erreurs de découpage syllabique, les homophonies courantes. Données : prénom enfant = ${prenom_enfant}, intervenants = ${JSON.stringify(intervenants)}. Format de réponse : [{ "mot_transcrit": "variante incorrecte", "mot_correct": "terme exact", "source": "onboarding_prenom" ou "onboarding_structure" selon que le terme vient du prénom de l'enfant ou d'un intervenant/structure }]`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ entries: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "[]").trim();

    let entries: Array<{ mot_transcrit: string; mot_correct: string; source?: string }> = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        entries = parsed;
      }
    } catch {
      console.error("Failed to parse AI response:", raw);
    }

    // Ensure source field is always set
    const defaultSource = mots ? "manual" : "onboarding_prenom";
    entries = entries.map((e) => ({
      ...e,
      source: e.source || defaultSource,
    }));

    return new Response(JSON.stringify({ entries }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-lexique error:", e);
    return new Response(JSON.stringify({ entries: [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
