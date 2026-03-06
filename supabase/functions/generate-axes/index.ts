import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    const { enfant_id, prenom_enfant, reponse_1, reponse_2, reponse_3 } = await req.json();

    if (!enfant_id || !prenom_enfant || !reponse_1 || !reponse_2 || !reponse_3) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const userPrompt = `Tu aides un parent à identifier les axes de développement de son enfant en situation de handicap. À partir de ces 3 réponses du parent, génère exactement 3 axes de développement.

Réponse 1 (ce sur quoi on travaille): ${reponse_1}
Réponse 2 (ce qu'on observe): ${reponse_2}
Réponse 3 (l'essentiel à garder en cap): ${reponse_3}

Règles pour les labels :
- 3 à 6 mots maximum
- Formulé comme un cap de travail actif, pas comme une citation ou une observation
- Dans les mots du parent, jamais en jargon clinique
- Exemples de bons labels : 'Tonus et tenue du corps', 'Se faire comprendre', 'Bouger plus librement', 'Bien-être et confort au quotidien'
- Exemples de mauvais labels : 'Que son corps soit moins un obstacle', 'Elle met en place des stratégies', 'Qu elle soit heureuse'

Règles absolues:
- Jamais de pronostic, jamais de diagnostic, jamais de comparaison à des normes
- Assigne une couleur hex à chaque axe selon sa nature:
  #E8736A moteur/physique, #8B74E0 cognitif/psychomoteur,
  #44A882 sensoriel/communication, #E8A44A bien-être/émotionnel,
  #8A9BAE médical/administratif

Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans backticks:
{ "axes": [
  { "label": "string", "couleur": "#hex" },
  { "label": "string", "couleur": "#hex" },
  { "label": "string", "couleur": "#hex" }
]}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Tu es un assistant spécialisé. Réponds UNIQUEMENT avec un JSON valide, sans markdown, sans commentaire." },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1000,
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
      return new Response(JSON.stringify({ error: "ai_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error("Failed to parse AI response:", raw);
      return new Response(JSON.stringify({ error: "parse_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!parsed.axes || !Array.isArray(parsed.axes) || parsed.axes.length !== 3) {
      console.error("Invalid axes structure:", parsed);
      return new Response(JSON.stringify({ error: "parse_failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ axes: parsed.axes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-axes error:", e);
    return new Response(JSON.stringify({ error: "parse_failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
