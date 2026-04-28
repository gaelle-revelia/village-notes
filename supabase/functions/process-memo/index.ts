import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const allowedOrigins = [
  "https://the-village.app",
  "https://thevillage-app.lovable.app",
];

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const QUESTION_REFORMULATION_PROMPT =
  `Tu es un assistant qui aide des parents d'enfants en situation de handicap. À partir de cette transcription, formule :

1. Une question principale courte et directe (max 10 mots, comme si le parent la posait à voix haute)
2. Si nécessaire, des précisions complémentaires en 1-2 phrases courtes, dans les mots du parent — sans formulations génériques comme "il s'agit de savoir" ou "dans le cadre de"

Réponds uniquement en JSON: { "question": "...", "precisions": "..." }`;

const RDV_REFORMULATION_PROMPT =
  `Tu aides des parents d'enfants en situation de handicap à noter leurs rendez-vous à venir. À partir de cette transcription, formule :

1. Un titre court et direct pour le RDV (max 8 mots, ex: "RDV kiné — bilan motricité" ou "Préparer consultation Dr Mensah")
2. Si nécessaire, des précisions complémentaires en 1-2 phrases courtes dans les mots du parent

Réponds uniquement en JSON: { "question": "...", "precisions": "..." }`;

const RAPPEL_REFORMULATION_PROMPT =
  `Tu aides des parents d'enfants en situation de handicap à noter leurs rappels et actions à faire. À partir de cette transcription, formule :

1. Un titre court et direct pour le rappel (max 8 mots, ex: "Relancer hôpital Bordeaux" ou "Envoyer dossier MDPH") — jamais sous forme de question, toujours sous forme d'action
2. Si nécessaire, des précisions complémentaires en 1-2 phrases courtes dans les mots du parent

Réponds uniquement en JSON: { "question": "...", "precisions": "..." }`;

const ANSWER_REFORMULATION_PROMPT =
  `Tu aides des parents d'enfants en situation de handicap à noter les réponses de leurs professionnels de santé. Reformule cette transcription en une réponse claire et directe, en 1 à 3 phrases courtes. Garde les termes médicaux importants. Réponds uniquement avec le texte reformulé, sans JSON, sans introduction.`;

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const isLovablePreview =
    origin.endsWith(".lovableproject.com") || origin.endsWith(".lovable.app");
  const corsOrigin =
    allowedOrigins.includes(origin) || isLovablePreview ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

function jsonResponse(body: unknown, corsHeaders: Record<string, string>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanJsonResponse(rawContent: string) {
  return rawContent.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
}

// Filet de sécurité serveur : refuser les audios > 16 MB (~8 min @ 32 kbps webm/opus avec marge).
// La borne UX (480 s) est posée côté client; ce filet protège le worker (limite mémoire ~150 MB).
const MAX_AUDIO_BYTES = 16 * 1024 * 1024;

function toBase64(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  // Encodage par chunks pour éviter O(n²) allocations (reduce + concat)
  // et "Maximum call stack size exceeded" sur fromCharCode.apply de gros tableaux.
  const CHUNK_SIZE = 32768; // 32 KB
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
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

    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
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
    const parsed = JSON.parse(cleanJsonResponse(rawContent));
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

async function transcribeTempAudio(
  supabase: any,
  lovableApiKey: string,
  audioPath: string,
): Promise<string> {
  let shouldDeleteAudio = false;

  try {
    const { data: audioData, error: downloadError } = await supabase.storage
      .from("audio-temp")
      .download(audioPath);

    if (downloadError || !audioData) {
      throw new HttpError(500, "Failed to download audio: " + downloadError?.message);
    }

    shouldDeleteAudio = true;

    const base64Audio = toBase64(await audioData.arrayBuffer());
    const transcribeResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Transcris fidèlement ce message audio en français. Retourne uniquement le texte transcrit, sans ponctuation excessive, sans mise en forme, sans commentaire.",
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
    });

    if (!transcribeResponse.ok) {
      const errText = await transcribeResponse.text();
      console.error("Transcription error:", transcribeResponse.status, errText);

      if (transcribeResponse.status === 429) {
        throw new HttpError(429, "Rate limit exceeded. Please try again later.");
      }
      if (transcribeResponse.status === 402) {
        throw new HttpError(402, "AI credits exhausted.");
      }

      throw new HttpError(500, "Transcription failed");
    }

    const transcribeResult = await transcribeResponse.json();
    const transcription = transcribeResult.choices?.[0]?.message?.content?.trim();

    if (!transcription) {
      throw new HttpError(500, "Transcription failed");
    }

    return transcription;
  } finally {
    if (shouldDeleteAudio) {
      const { error: removeError } = await supabase.storage.from("audio-temp").remove([audioPath]);
      if (removeError) {
        console.error("Failed to delete temp audio:", removeError.message);
      }
    }
  }
}

async function reformulateQuestionFromTranscription(
  lovableApiKey: string,
  transcription: string,
  prompt: string = QUESTION_REFORMULATION_PROMPT,
  context?: {
    childPrenom?: string | null;
    intervenantsNoms?: string[];
    lexiqueFormatted?: string | null;
  },
): Promise<{ question: string; precisions: string | null }> {
  let contextStr = "";
  if (context?.childPrenom) {
    contextStr += `\nPrénom de l'enfant : ${context.childPrenom} (orthographe exacte, ne jamais modifier)`;
  }
  if (context?.intervenantsNoms?.length) {
    contextStr += `\nIntervenants du Village : ${context.intervenantsNoms.join(", ")} (orthographes exactes)`;
  }
  if (context?.lexiqueFormatted) {
    contextStr += `\nLexique phonétique :\n${context.lexiqueFormatted}`;
  }

  const reformulationResponse = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Transcription : ${transcription}${contextStr}`,
        },
      ],
    }),
  });

  if (!reformulationResponse.ok) {
    const errText = await reformulationResponse.text();
    console.error("Question reformulation error:", reformulationResponse.status, errText);

    if (reformulationResponse.status === 429) {
      throw new HttpError(429, "Rate limit exceeded. Please try again later.");
    }
    if (reformulationResponse.status === 402) {
      throw new HttpError(402, "AI credits exhausted.");
    }

    throw new HttpError(500, "Question reformulation failed");
  }

  const reformulationResult = await reformulationResponse.json();
  const rawContent = reformulationResult.choices?.[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(cleanJsonResponse(rawContent));
    const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
    const precisions = typeof parsed.precisions === "string" ? parsed.precisions.trim() : "";

    if (!question) {
      throw new Error("Missing question in reformulation response");
    }

    return {
      question,
      precisions: precisions || null,
    };
  } catch (error) {
    console.error("Question reformulation JSON parse failed:", rawContent, error);
    throw new HttpError(500, "Question reformulation failed");
  }
}

async function reformulateAnswerFromTranscription(
  lovableApiKey: string,
  transcription: string,
): Promise<string> {
  const response = await fetch(AI_GATEWAY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: ANSWER_REFORMULATION_PROMPT },
        { role: "user", content: `Transcription : ${transcription}` },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Answer reformulation error:", response.status, errText);

    if (response.status === 429) {
      throw new HttpError(429, "Rate limit exceeded. Please try again later.");
    }
    if (response.status === 402) {
      throw new HttpError(402, "AI credits exhausted.");
    }

    throw new HttpError(500, "Answer reformulation failed");
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content || "";
  return content.trim();
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, corsHeaders, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: "Unauthorized" }, corsHeaders, 401);
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { memo_id, mode, text_input, audio_path, boucle_type, child_id } = body;

    if (mode === "transcription_only" || mode === "clean_transcription" || mode === "question_reformulation" || mode === "answer_reformulation") {
      if (!audio_path) {
        return jsonResponse({ error: `audio_path required for ${mode} mode` }, corsHeaders, 400);
      }

      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const transcription = await transcribeTempAudio(supabase, lovableApiKey, audio_path);

      if (mode === "transcription_only") {
        return jsonResponse({ transcription }, corsHeaders);
      }

      if (mode === "clean_transcription") {
        let lexiqueFormatted: string | null = null;
        if (child_id) {
          const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);
          const { data: lexiqueEntries } = await supabaseClient
            .from("enfant_lexique")
            .select("mot_transcrit, mot_correct")
            .eq("enfant_id", child_id);
          if (lexiqueEntries?.length) {
            lexiqueFormatted = lexiqueEntries
              .map((e: any) => `${e.mot_transcrit} → ${e.mot_correct}`)
              .join("\n");
          }
        }

        const cleanPrompt = `Tu nettoies une transcription vocale d'un parent d'enfant en situation de handicap.

RÈGLES ABSOLUES :
- Supprimer uniquement les mots parasites : euh, hum, hein, bah, ben, voilà voilà, donc euh, en fait, genre, ok ok, etc.
- Corriger la ponctuation basique (majuscule en début, point en fin)
- Appliquer le lexique phonétique fourni pour corriger les erreurs de transcription
- NE JAMAIS reformuler, résumer, restructurer ou réinterpréter
- NE JAMAIS ajouter d'informations
- Conserver exactement les mots et l'ordre des idées du parent
- Retourner uniquement le texte nettoyé, sans commentaire, sans guillemets`;

        const userMessage = lexiqueFormatted
          ? `Transcription : ${transcription}\n\nLexique phonétique :\n${lexiqueFormatted}`
          : `Transcription : ${transcription}`;

        const cleanResponse = await fetch(AI_GATEWAY_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: "system", content: cleanPrompt },
              { role: "user", content: userMessage },
            ],
          }),
        });

        if (!cleanResponse.ok) {
          return jsonResponse({ transcription }, corsHeaders);
        }

        const cleanData = await cleanResponse.json();
        const cleaned = cleanData.choices?.[0]?.message?.content?.trim() || transcription;
        return jsonResponse({ transcription: cleaned }, corsHeaders);
      }

      if (mode === "question_reformulation") {
        const reformulationPrompt =
          boucle_type === "rdv" ? RDV_REFORMULATION_PROMPT :
          boucle_type === "rappel" ? RAPPEL_REFORMULATION_PROMPT :
          QUESTION_REFORMULATION_PROMPT;

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

        let childPrenom: string | null = null;
        let intervenantsNoms: string[] = [];
        let lexiqueFormattedCtx: string | null = null;

        if (child_id) {
          const { data: enfant } = await supabaseClient
            .from("enfants")
            .select("prenom")
            .eq("id", child_id)
            .single();
          childPrenom = enfant?.prenom ?? null;

          const { data: intervenants } = await supabaseClient
            .from("intervenants")
            .select("nom, specialite")
            .eq("enfant_id", child_id)
            .eq("actif", true);
          intervenantsNoms = (intervenants ?? []).map((i: any) =>
            i.specialite ? `${i.nom} (${i.specialite})` : i.nom
          );

          const { data: lexiqueEntries } = await supabaseClient
            .from("enfant_lexique")
            .select("mot_transcrit, mot_correct")
            .eq("enfant_id", child_id);

          if (lexiqueEntries?.length) {
            const grouped = lexiqueEntries.reduce((acc: Record<string, string[]>, entry: any) => {
              if (!acc[entry.mot_correct]) acc[entry.mot_correct] = [];
              acc[entry.mot_correct].push(entry.mot_transcrit);
              return acc;
            }, {} as Record<string, string[]>);
            lexiqueFormattedCtx = Object.entries(grouped)
              .map(([correct, variants]) =>
                `"${(variants as string[]).join('", "')}" → "${correct}"`)
              .join("\n");
          }
        }

        const reformulated = await reformulateQuestionFromTranscription(
          lovableApiKey,
          transcription,
          reformulationPrompt,
          { childPrenom, intervenantsNoms, lexiqueFormatted: lexiqueFormattedCtx },
        );
        return jsonResponse(reformulated, corsHeaders);
      }

      const answer = await reformulateAnswerFromTranscription(lovableApiKey, transcription);
      return jsonResponse({ answer }, corsHeaders);
    }

    if (!memo_id) {
      return jsonResponse({ error: "memo_id required" }, corsHeaders, 400);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: memo, error: memoError } = await supabase
      .from("memos")
      .select("*")
      .eq("id", memo_id)
      .eq("user_id", userId)
      .single();

    if (memoError || !memo) {
      return jsonResponse({ error: "Memo not found" }, corsHeaders, 404);
    }

    let transcription = "";

    if (mode === "text" || mode === "text_quick") {
      transcription = text_input || "";
    } else {
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

      const base64Audio = toBase64(await audioData.arrayBuffer());
      const transcribeResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
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
      });

      if (!transcribeResponse.ok) {
        const errText = await transcribeResponse.text();
        console.error("Transcription error:", transcribeResponse.status, errText);

        await supabase.storage.from("audio-temp").remove([storagePath]);

        if (transcribeResponse.status === 429) {
          await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
          return jsonResponse({ error: "Rate limit exceeded. Please try again later." }, corsHeaders, 429);
        }
        if (transcribeResponse.status === 402) {
          await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
          return jsonResponse({ error: "AI credits exhausted. Please add credits." }, corsHeaders, 402);
        }

        await supabase.from("memos").update({ processing_status: "error" }).eq("id", memo_id);
        throw new Error("Transcription failed");
      }

      const transcribeResult = await transcribeResponse.json();
      transcription = transcribeResult.choices?.[0]?.message?.content || "";

      await supabase.storage.from("audio-temp").remove([storagePath]);
    }

    await supabase
      .from("memos")
      .update({ transcription_raw: transcription, processing_status: "structuring" })
      .eq("id", memo_id);

    const { data: enfant } = memo.enfant_id
      ? await supabase.from("enfants").select("prenom, diagnostic_label").eq("id", memo.enfant_id).single()
      : { data: null };

    const { data: intervenant } = memo.intervenant_id
      ? await supabase.from("intervenants").select("nom, specialite").eq("id", memo.intervenant_id).single()
      : { data: null };

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

    if (mode === "text_quick") {
      const quickResponse = await fetch(AI_GATEWAY_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: AI_MODEL,
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
      });

      let resume = transcription.substring(0, 60);
      if (quickResponse.ok) {
        const quickResult = await quickResponse.json();
        const rawContent = quickResult.choices?.[0]?.message?.content || "";
        try {
          const parsed = JSON.parse(cleanJsonResponse(rawContent));
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

    const structureResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
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
                    items: {
                      type: "string",
                      enum: ["Moteur", "Cognitif", "Sensoriel", "Bien-être", "Médical", "Administratif"],
                    },
                    maxItems: 3,
                    description: "Domaines concernés par ce mémo. Choisir uniquement parmi les valeurs autorisées.",
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
    });

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
    if (error instanceof HttpError) {
      return jsonResponse({ error: error.message }, corsHeaders, error.status);
    }

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