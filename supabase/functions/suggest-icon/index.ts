import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

const ALLOWED_ICONS = [
  "Footprints","Bike","Baby","Heart","Brain","Ear","Eye","Hand","Stethoscope","Activity",
  "Dumbbell","Wind","Music","Smile","Sun","Star","Flower2","Leaf","Waves","Circle",
  "ArrowUp","MoveHorizontal","StretchHorizontal","PersonStanding","Accessibility",
  "Gamepad2","Puzzle","BookOpen","Paintbrush","Scissors","Timer","Zap","Sparkles",
];

const SYSTEM_PROMPT = `Tu es un assistant qui choisit une icône Lucide React adaptée pour une activité thérapeutique d'enfant.
Réponds UNIQUEMENT avec le nom exact de l'icône parmi cette liste :
Footprints, Bike, Baby, Heart, Brain, Ear, Eye, Hand, Stethoscope, Activity,
Dumbbell, Wind, Music, Smile, Sun, Star, Flower2, Leaf, Waves, Circle,
ArrowUp, MoveHorizontal, StretchHorizontal, PersonStanding, Accessibility,
Gamepad2, Puzzle, BookOpen, Paintbrush, Scissors, Timer, Zap, Sparkles`;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nom, domaine } = await req.json();
    if (!nom || !domaine) {
      return new Response(JSON.stringify({ error: "nom and domaine required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Activité : ${nom}, Domaine : ${domaine}` },
        ],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ icon: "Activity" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const raw = (data.choices?.[0]?.message?.content ?? "Activity").trim();
    const icon = ALLOWED_ICONS.includes(raw) ? raw : "Activity";

    return new Response(JSON.stringify({ icon }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("suggest-icon error:", e);
    return new Response(JSON.stringify({ icon: "Activity" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
