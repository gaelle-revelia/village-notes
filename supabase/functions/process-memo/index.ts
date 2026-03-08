import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

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

async function detectPepites(
  supabase: any,
  lovableApiKey: string,
  memo_id: string,
  enfant_id: string | null,
  resume: string | null | undefined
) {
  try {
    if (!enfant_id || !resume) return;

    const { data: axes } = await supabase
      .from("axes_developpement")
      .select("id, label")
      .eq("enfant_id", enfant_id)
      .eq("actif", true);

    if (!axes || axes.length === 0) return;

    const axesFormatted = axes.map((a: any) => `- ID: ${a.id} | Label: ${a.label}`).join("\n");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
            content: `Tu analyses un mémo parental d'un enfant en situation de handicap.
Résumé du mémo : '${resume}'
Axes actifs :
${axesFormatted}
Réponds UNIQUEMENT avec un JSON valide sans markdown :
{ "axe_ids": ["uuid"] }
0, 1 ou 2 axe_ids maximum. [] si aucun lien évident.
Interdit : pronostic, diagnostic, comparaison à des normes.`,
          },
          { role: "user", content: "Analyse ce mémo et retourne les axe_ids correspondants." },
        ],
      }),
    });

    if (!response.ok) {
      console.error("detectPepites AI error:", response.status);
      return;
    }

    const result = await response.json();
    const rawContent = result.choices?.[0]?.message?.content || "";
    const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    const axeIds: string[] = Array.isArray(parsed.axe_ids) ? parsed.axe_ids.slice(0, 2) : [];

    const validAxeIds = axes.map((a: any) => a.id);
    for (const axeId of axeIds) {
      if (!validAxeIds.includes(axeId)) continue;
      await supabase
        .from("pepites")
        .upsert({ memo_id, axe_id: axeId }, { onConflict: "memo_id,axe_id", ignoreDuplicates: true });
    }
  } catch (err) {
    console.error("detectPepites error (non-blocking):", err);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    const body = await req.json();
    const { memo_id, mode, text_input, audio_path } = body;

    // --- transcription_only mode: no memo interaction ---
    if (mode === "transcription_only") {
      if (!audio_path) {
        return new Response(JSON.stringify({ error: "audio_path required for transcription_only mode" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { data: audioData, error: downloadError } = await supabase.storage
        .from("audio-temp")
        .download(audio_path);

      if (downloadError || !audioData) {
        return new Response(JSON.stringify({ error: "Failed to download audio: " + downloadError?.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const arrayBuffer = await audioData.arrayBuffer();
      const base64Audio = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );

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
                content: "Transcris fidèlement ce message audio en français. Retourne uniquement le texte transcrit, sans ponctuation excessive, sans mise en forme, sans commentaire.",
              },
              {
                role: "user",
                content: [
                  { type: "input_audio", input_audio: { data: base64Audio, format: "wav" } },
                  { type: "text", text: "Transcris cet enregistrement vocal en français." },
                ],
              },
            ],
          }),
        }
      );

      // Delete audio immediately
      await supabase.storage.from("audio-temp").remove([audio_path]);

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text();
        console.error("Transcription error:", transcribeResponse.status, errText);
        if (transcribeResponse.status === 429) {
          return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (transcribeResponse.status === 402) {
          return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
            status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ error: "Transcription failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const transcribeResult = await transcribeResponse.json();
      const transcription = transcribeResult.choices?.[0]?.message?.content || "";

      return new Response(
        JSON.stringify({ transcription }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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

    if (mode === "text" || mode === "text_quick") {
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

        // Always delete audio file on error to prevent orphaned files
        await supabase.storage.from("audio-temp").remove([storagePath]);

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

    // Fetch lexique for contextual correction
    const { data: lexiqueEntries } = memo.enfant_id
      ? await supabase
          .from("enfant_lexique")
          .select("mot_transcrit, mot_correct")
          .eq("enfant_id", memo.enfant_id)
      : { data: null };

    const lexiqueFormatted = lexiqueEntries?.length
      ? Object.entries(
          lexiqueEntries.reduce((acc, entry) => {
            if (!acc[entry.mot_correct]) acc[entry.mot_correct] = [];
            acc[entry.mot_correct].push(entry.mot_transcrit);
            return acc;
          }, {} as Record<string, string[]>)
        )
          .map(([correct, variants]) =>
            `"${variants.join('", "')}" → peut désigner "${correct}"`
          )
          .join("\n")
      : null;

    // --- text_quick: simplified AI call for quick notes ---
    if (mode === "text_quick") {
      const quickResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              {
                role: "system",
                content: `Tu es un assistant qui résume des notes de parents d'enfants en rééducation.
Réponds UNIQUEMENT avec un objet JSON valide : { "resume": "..." }. Aucun texte autour.
Le résumé doit être factuel, 5 à 8 mots, format [Contexte] — [fait principal].
Jamais de diagnostic, commentaire éditorial ou jargon médical.
${enfant?.prenom ? `Prénom de l'enfant : ${enfant.prenom} (ne jamais modifier l'orthographe)` : ""}
${intervenant ? `Intervenant : ${intervenant.nom}${intervenant.specialite ? ` — ${intervenant.specialite}` : ""}` : ""}
${lexiqueFormatted ? `Lexique contextuel :\n${lexiqueFormatted}` : ""}`,
              },
              {
                role: "user",
                content: `Note du parent : "${transcription}"\n\nGénère le résumé JSON.`,
              },
            ],
          }),
        }
      );

      let resume = transcription.substring(0, 60);
      if (quickResponse.ok) {
        const quickResult = await quickResponse.json();
        const rawContent = quickResult.choices?.[0]?.message?.content || "";
        try {
          const cleaned = rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
          const parsed = JSON.parse(cleaned);
          if (parsed.resume) resume = parsed.resume;
        } catch {
          console.error("text_quick JSON parse failed, using fallback");
        }
      } else {
        console.error("text_quick AI error:", quickResponse.status);
      }

      const quickStructured = {
        resume,
        details: [transcription],
        a_retenir: null,
        tags: null,
        intervenant_detected: null,
        mode: "text_quick",
      };

      await supabase.from("memos").update({
        content_structured: quickStructured,
        processing_status: "done",
      }).eq("id", memo_id);

      await detectPepites(supabase, lovableApiKey, memo_id, memo.enfant_id, quickStructured.resume);

      return new Response(
        JSON.stringify({
          transcription,
          structured: quickStructured,
          status: "done",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Structure with Gemini using tool calling
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
              content: `Tu es un assistant organisationnel pour parents d'enfants en rééducation. Tu reçois la transcription brute d'une note vocale.

━━━ RÈGLES ABSOLUES ━━━
JAMAIS :
- Diagnostic, pronostic ou recommandation médicale
- Commentaire éditorial ("très bien passée", "belle avancée")
- Jargon médical que le parent n'a pas utilisé
- Inventer une information absente de la note

TOUJOURS :
- Conserver les mots exacts du parent quand ils sont précis
- Rester factuel : ce que le parent a observé, pas ce que ça signifie
- Si un champ n'est pas mentionné → null, sans exception

━━━ PRÉNOM DE L'ENFANT ━━━
${enfant?.prenom ? `Le prénom exact de l'enfant est : ${enfant.prenom}
RÈGLE STRICTE : ce prénom doit apparaître dans ta réponse exactement tel quel — jamais accentué, jamais modifié, jamais remplacé par une autre graphie. Toute autre orthographe est une erreur.` : ""}

━━━ CONTEXTE ━━━
${enfant ? `Enfant : ${enfant.prenom}${enfant.diagnostic_label ? ` (${enfant.diagnostic_label})` : ""}` : ""}
${intervenant ? `Intervenant : ${intervenant.nom}${intervenant.specialite ? ` — ${intervenant.specialite}` : ""}` : ""}

━━━ LEXIQUE DE CORRECTION CONTEXTUELLE ━━━
${lexiqueFormatted ? `Les paires suivantes sont des variantes phonétiques de mots spécifiques à cet enfant et sa famille.
Pour chaque variante détectée, examine le contexte complet :
- Si le mot est utilisé comme verbe ou nom commun français → NE PAS corriger (ex: "Selena apprend à boire" → conserver)
- Si le contexte suggère un lieu, nom propre ou appareil → corriger (ex: "elle va à boire" → incohérent → "Bohars")
- En cas de doute → NE PAS corriger

${lexiqueFormatted}` : "(aucun lexique pour cet enfant)"}`,
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
                      description: "Titre factuel 5 à 8 mots. Format : [Contexte] — [fait]. Ex: \"Kiné — appui ventral travaillé au sol\". Aucun adjectif évaluatif. Aucun commentaire.",
                    },
                    details: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 5,
                      description: "Observations factuelles du parent. 1 fait par item. Mots exacts du parent. Zéro commentaire éditorial.",
                    },
                    a_retenir: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 3,
                      description: "Points d'attention, axes de travail à la maison, rappels pour le prochain RDV. Uniquement si mentionnés par le parent. Formulation actionnable. Null si rien de mentionné.",
                    },
                    tags: {
                      type: "array",
                      items: { type: "string" },
                      maxItems: 4,
                      description: "Domaine ou intervenant détecté. Exemples : Kiné, Psychomot, Ergo, Moteur, Sensoriel, Cognitif, Bien-être, Médical, Parent.",
                    },
                    intervenant_detected: {
                      type: ["string", "null"],
                      description: "Nom exact de l'intervenant selon contexte et lexique. Null si non mentionné.",
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

    await detectPepites(supabase, lovableApiKey, memo_id, memo.enfant_id, structured?.resume);

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
