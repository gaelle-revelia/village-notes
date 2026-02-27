import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

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
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Verify user
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const { memo_id, mode, text_input } = await req.json();
    if (!memo_id) {
      return new Response(JSON.stringify({ error: "memo_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify memo belongs to user
    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memo_id)
      .eq("user_id", userId)
      .single();

    if (memoError || !memo) {
      return new Response(JSON.stringify({ error: "Memo not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let transcription = "";

    if (mode === "text") {
      transcription = text_input || "";
    } else {
      // Voice mode: download from audio-temp bucket and transcribe
      await supabase
        .from("memos")
        .update({ processing_status: "transcribing" })
        .eq("id", memo_id);

      const storagePath = `${userId}/${memo_id}.webm`;
      const { data: audioData, error: downloadError } = await supabase.storage
        .from("audio-temp")
        .download(storagePath);

      if (downloadError || !audioData) {
        await supabase
          .from("memos")
          .update({ processing_status: "error" })
          .eq("id", memo_id);
        throw new Error("Failed to download audio: " + downloadError?.message);
      }

      // Convert to base64
      const arrayBuffer = await audioData.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

      // Transcribe with Gemini (multimodal)
      const transcribeResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              {
                role: "system",
                content:
                  "Tu es un transcripteur français expert. Transcris fidèlement l'audio en français. Retourne UNIQUEMENT la transcription, sans commentaire ni formatage.",
              },
              {
                role: "user",
                content: [
                  {
                    type: "input_audio",
                    input_audio: { data: base64Audio, format: "wav" },
                  },
                  {
                    type: "text",
                    text: "Transcris cet enregistrement vocal en français.",
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text();
        console.error("Transcription error:", transcribeResponse.status, errText);

        if (transcribeResponse.status === 429) {
          await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (transcribeResponse.status === 402) {
          await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
          return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
        throw new Error("Transcription failed");
      }

      const transcribeResult = await transcribeResponse.json();
      transcription = transcribeResult.choices?.[0]?.message?.content || "";

      // Delete audio file immediately after successful transcription
      await supabase.storage.from("audio-temp").remove([storagePath]);
    }

    // Save transcription and update status
    await supabase
      .from("memos")
      .update({ transcription_raw: transcription, processing_status: "structuring" })
      .eq("id", memo_id);

    // Fetch child & intervenant info for context
    const { data: enfant } = memo.enfant_id
      ? await supabase.from("enfants").select("prenom, diagnostic_label").eq("id", memo.enfant_id).single()
      : { data: null };

    const { data: intervenant } = memo.intervenant_id
      ? await supabase.from("intervenants").select("nom, specialite").eq("id", memo.intervenant_id).single()
      : { data: null };

    // Structure with Gemini using tool calling — updated prompt per spec
    const structureResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content: `Tu es un assistant organisationnel pour parents d'enfants en rééducation.
Tu reçois la transcription d'une note vocale d'un parent après une séance.

RÈGLES ABSOLUES :
❌ Tu ne fais JAMAIS de diagnostic, pronostic ou recommandation médicale
❌ Tu ne déduces JAMAIS ce que l'enfant "est" — seulement ce que le parent "a observé"
❌ Tu n'interprètes JAMAIS les données médicales
❌ Tu n'utilises PAS de jargon médical que le parent n'a pas utilisé lui-même
✅ Tu organises, résumes, tagges et structures CE QUE LE PARENT A DIT
✅ Tu utilises le vocabulaire du parent, pas un vocabulaire médical inventé
✅ Le ton est bienveillant, sobre, factuel

${enfant ? `Enfant : ${enfant.prenom}${enfant.diagnostic_label ? ` (${enfant.diagnostic_label})` : ""}` : ""}
${intervenant ? `Intervenant : ${intervenant.nom}${intervenant.specialite ? ` — ${intervenant.specialite}` : ""}` : ""}`,
            },
            {
              role: "user",
              content: `Voici la transcription d'un mémo vocal d'un parent après une séance :\n\n"${transcription}"\n\nStructure cette note.`,
            },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "structure_memo",
                description: "Structure a parent's memo into organized sections",
                parameters: {
                  type: "object",
                  properties: {
                    resume: {
                      type: "string",
                      description: "1-2 phrases résumant la séance selon les mots du parent",
                    },
                    details: {
                      type: "array",
                      items: { type: "string" },
                      description: "Points rapportés par le parent (3-5 max)",
                    },
                    suggestions: {
                      type: "array",
                      items: { type: "string" },
                      description: "Actions détectées dans la note si présentes (0-3)",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      description: "Domaine ou intervenant détecté (ex: moteur, sensoriel, cognitif, social, administratif). 1-4 tags.",
                    },
                    intervenant_detected: {
                      type: "string",
                      description: "Nom de l'intervenant mentionné dans la note, ou null",
                    },
                  },
                  required: ["resume", "details", "tags"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "structure_memo" } },
        }),
      }
    );

    if (!structureResponse.ok) {
      console.error("Structuration error:", structureResponse.status, await structureResponse.text());
      await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
      throw new Error("Structuration failed");
    }

    const structureResult = await structureResponse.json();
    const toolCall = structureResult.choices?.[0]?.message?.tool_calls?.[0];
    let structured = null;

    if (toolCall?.function?.arguments) {
      try {
        structured = JSON.parse(toolCall.function.arguments);
      } catch {
        console.error("Failed to parse structured output");
      }
    }

    // Update memo with final result
    await supabase
      .from("memos")
      .update({
        content_structured: structured,
        processing_status: "done",
      })
      .eq("id", memo_id);

    return new Response(
      JSON.stringify({
        transcription,
        structured,
        status: "done",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("process-memo error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
