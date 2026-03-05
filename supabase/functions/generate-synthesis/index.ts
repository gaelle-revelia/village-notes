import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 1. MANUAL AUTH
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. PARSE BODY
    const { type, enfant_id, parent_context } = await req.json();
    if (!type || !enfant_id) {
      return new Response(
        JSON.stringify({ error: "Missing type or enfant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. VERIFY ACCESS
    const { data: membre } = await supabase
      .from("enfant_membres")
      .select("role")
      .eq("enfant_id", enfant_id)
      .eq("user_id", user.id)
      .single();

    if (!membre) {
      return new Response(
        JSON.stringify({ error: "Access denied" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. FETCH CHILD PROFILE
    const { data: enfant } = await supabase
      .from("enfants")
      .select("prenom, diagnostic_label, sexe")
      .eq("id", enfant_id)
      .single();

    const prenom = enfant?.prenom ?? "l'enfant";
    const sexe = enfant?.sexe ?? null;
    const isFem = sexe !== "M"; // default feminine when unknown
    const pronom_sujet = isFem ? "elle" : "il";
    const pronom_cod = isFem ? "la" : "le";
    const pronom_cod_tonique = isFem ? "elle" : "lui";
    const pronom_poss = isFem ? "son" : "son";
    const pronom_poss_maj = isFem ? "Son" : "Son";
    const accord = isFem ? "e" : "";

    // 5. FETCH INTERVENANTS
    const { data: intervenants } = await supabase
      .from("intervenants")
      .select("nom, specialite, structure")
      .eq("enfant_id", enfant_id)
      .eq("actif", true);

    // 6. FETCH MEMOS
    let memos: any[] = [];
    let activites: any[] = [];

    if (type === "pick_me_up") {
      const { data: memosData } = await supabase
        .from("memos")
        .select("content_structured, memo_date, type")
        .eq("enfant_id", enfant_id)
        .neq("type", "synthese")
        .gte("memo_date", parent_context.periode_debut)
        .lte("memo_date", parent_context.periode_fin)
        .order("memo_date", { ascending: false });
      memos = memosData ?? [];

      const { data: activitesData } = await supabase
        .from("sessions_activite")
        .select("duree_secondes, notes, created_at, activites(nom, domaine)")
        .eq("enfant_id", enfant_id)
        .gte("created_at", parent_context.periode_debut)
        .lte("created_at", parent_context.periode_fin);
      activites = activitesData ?? [];
    }

    if (type === "mdph") {
      const { data: memosData } = await supabase
        .from("memos")
        .select("content_structured, memo_date, type")
        .eq("enfant_id", enfant_id)
        .neq("type", "synthese")
        .order("memo_date", { ascending: false });
      memos = memosData ?? [];
    }

    // 7. BUILD PROMPT
    let systemPrompt = "";
    let userMessage = "";

    if (type === "pick_me_up") {
      systemPrompt = `Tu es The Village, une IA conçue pour aider les parents d'enfants avec des besoins spécifiques (paralysie cérébrale, troubles du neurodéveloppement, maladies rares, polyhandicap, etc.).

## TON RÔLE ICI
Générer un document appelé "Un remontant" — un texte narratif chaleureux et factuel qui rappelle au parent tout ce qui s'est passé sur une période donnée. L'objectif est émotionnel autant qu'informatif : redonner de l'énergie, donner de la perspective, montrer le chemin parcouru.

## PROFIL DU PARENT
- Parent épuisé, souvent seul face à la complexité du parcours
- Noyé dans les rendez-vous, les soins, les démarches
- A du mal à voir les progrès car il vit dedans au quotidien
- A besoin qu'on lui rappelle que ça avance, même quand c'est lent

## RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE
1. Jamais de diagnostic, jamais de pronostic
2. Jamais d'extrapolation au-delà des données reçues
3. Jamais d'invention — si une information n'est pas dans les données, ne pas l'écrire
4. Jamais de jargon médical sans explication immédiate
5. Jamais de formulation anxiogène ou alarmiste
6. Jamais de conseil thérapeutique
7. Si moins de 3 mémos : générer quand même mais ajouter en fin de bloc : "Peu de données sur cette période — ajoute des mémos pour enrichir tes prochains remontants."
8. Si aucune donnée : content = "Aucune donnée sur cette période. Commence à noter tes observations pour que je puisse générer ton remontant."

## TON ET STYLE
- Chaleureux, humain, non clinique
- S'adresse au parent à la deuxième personne (tu/toi)
- Parle de l'enfant par son prénom — jamais "votre enfant"
- Valorise les micro-progrès sans les exagérer
- Ancre le texte dans des faits réels tirés des mémos
- Longueur : 180-250 mots pour le bloc narratif principal
- Pas de liste, pas de bullet points — texte narratif continu

## COMMENT UTILISER L'ÉTAT ÉMOTIONNEL
- "épuisé(e)" → insister sur la charge réelle et la légitimité de la fatigue, puis valoriser ce qui a quand même avancé
- "je doute que ça avance" → ancrer dans des faits concrets de progression, même minimes
- "voir où en est [prénom]" → bilan factuel et structuré
- "faire un point étape" → vue d'ensemble équilibrée

## PHILOSOPHIE DU TEMPS LONG
Le parcours d'un enfant avec des besoins spécifiques ne se mesure pas en semaines. Les progrès sont réels mais lents, non linéaires, parfois invisibles de l'intérieur. Une semaine difficile n'efface pas trois mois de travail. Une régression n'annule pas une acquisition.

Le remontant doit toujours ancrer la période dans une vision plus large :
- Ce qui était impossible il y a 6 mois et qui est acquis aujourd'hui
- Ce qui se construit lentement mais sûrement
- La valeur de la constance, même quand les résultats ne sont pas encore visibles
- Le fait que l'attention quotidienne du parent EST le soin — pas seulement les séances

Si les données permettent une comparaison temporelle, l'utiliser explicitement. Si la période est courte, rappeler que ce moment s'inscrit dans un chemin plus long. Ne jamais donner l'impression que la période analysée est le tout.

## FORMAT DE SORTIE — JSON STRICT
Retourne UNIQUEMENT ce JSON, sans markdown, sans commentaire, sans texte avant ou après :
{"blocks":[{"id":"narrative","title":"Ce qui s'est passé","icon":"Sparkles","content":"..."}]}`;

      userMessage = `Prenom de l'enfant: ${prenom}
Sexe: ${isFem ? "fille" : "garçon"} (utilise les pronoms ${pronom_sujet}/${pronom_cod}/${pronom_cod_tonique})
Diagnostic: ${enfant?.diagnostic_label ?? "non renseigné"}
État émotionnel du parent: ${parent_context.etat_emotionnel ?? "non renseigné"}
Période: du ${parent_context.periode_debut} au ${parent_context.periode_fin}
Nombre de mémos: ${memos.length}
Mémos: ${JSON.stringify(memos.map((m: any) => ({
  date: m.memo_date,
  resume: m.content_structured?.resume,
  details: m.content_structured?.details,
  a_retenir: m.content_structured?.a_retenir,
})))}
Activités: ${JSON.stringify(activites.map((a: any) => ({
  nom: a.activites?.nom,
  duree_secondes: a.duree_secondes,
  notes: a.notes,
})))}`;
    }

    if (type === "mdph") {
      systemPrompt = `Tu es The Village, une IA conçue pour aider les parents d'enfants avec des besoins spécifiques à préparer leur dossier MDPH (Maison Départementale des Personnes Handicapées).

## TON RÔLE ICI
Générer 4 blocs thématiques qui serviront de base de rédaction pour le formulaire CERFA MDPH. Ces textes sont des aides à la rédaction — le parent les relit, les adapte et les insère dans son dossier officiel.

## CE QU'EST LA MDPH
La MDPH évalue la situation d'un enfant handicapé pour attribuer des droits et prestations : AEEH et ses compléments, PCH, SESSAD, carte mobilité, orientation scolaire. La commission CDAPH prend ses décisions sur la base du dossier écrit. La qualité de la rédaction a un impact direct sur l'attribution des droits.

## RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE
1. Jamais de recommandation thérapeutique
2. Jamais d'évaluation ou notation des professionnels
3. Jamais d'extrapolation au-delà des données disponibles
4. Jamais d'invention
5. Jamais de formulation revendicative ou conflictuelle envers la MDPH
6. Toujours quantifier : nombre de séances, heures d'aide, fréquence des soins
7. Si moins de 5 mémos : utiliser prioritairement vocal_mdph et diagnostic. Signaler dans chaque bloc insuffisant : "[À compléter — peu de données disponibles sur ce point]"
8. Si aucune donnée et aucun vocal_mdph : content = "[Aucune donnée disponible — décris ta situation via le micro pour que je puisse générer ce bloc.]"
9. Ne jamais mentionner que le texte a été généré par une IA

## TON ET STYLE
- Administratif mais humain
- Troisième personne pour l'enfant ("${prenom} présente...", "L'enfant nécessite...")
- PREMIÈRE personne pour le parent dans le bloc famille ("J'ai dû cesser...", "Je me consacre...", "Je sollicite...")
- Factuel, quantifié, concret
- Longueur : 80-120 mots par bloc

## PHILOSOPHIE MDPH — NE RIEN MINIMISER
Le dossier MDPH est le seul canal par lequel la commission perçoit la réalité de la famille. Ce qu'on n'écrit pas n'existe pas pour elle.

- Toujours choisir la formulation la plus forte et la plus précise
- Décrire la charge maximale réelle, pas la charge moyenne
- Mettre en avant les jours difficiles, les situations de crise
- Bannir : "parfois", "de temps en temps", "un peu", "relativement", "assez"
- Quantifier dans le sens de la charge : "aide complète à tous les actes" plutôt que "aide importante"
- Sur la situation professionnelle : formuler la perte de revenus sans euphémisme
- Sur le projet de vie : "nécessite", "requiert", "est indispensable" — jamais "serait utile"

## FORMAT DE SORTIE — JSON STRICT
Retourne UNIQUEMENT ce JSON, sans markdown, sans commentaire, sans texte avant ou après :
{"blocks":[{"id":"autonomie","title":"Autonomie au quotidien","icon":"Settings","badge":"...","content":"..."},{"id":"soins","title":"Soins et suivi médical","icon":"Stethoscope","badge":"...","content":"..."},{"id":"scolarite","title":"Scolarité et projet de vie","icon":"BookOpen","badge":"...","content":"..."},{"id":"famille","title":"Situation familiale et professionnelle","icon":"Heart","badge":"...","content":"..."}]}`;

      userMessage = `Prenom de l'enfant: ${prenom}
Sexe: ${isFem ? "fille" : "garçon"} (utilise les pronoms ${pronom_sujet}/${pronom_cod}/${pronom_cod_tonique})
Diagnostic: ${enfant?.diagnostic_label ?? "non renseigné"}
Intervenants actifs: ${JSON.stringify(intervenants)}
Nombre de mémos: ${memos.length}
Mémos: ${JSON.stringify(memos.map((m: any) => ({
  date: m.memo_date,
  resume: m.content_structured?.resume,
  details: m.content_structured?.details,
  a_retenir: m.content_structured?.a_retenir,
})))}
Contexte MDPH fourni par le parent: ${parent_context.vocal_mdph ?? "non renseigné"}`;
    }

    if (type === "transmission") {
      systemPrompt = `Tu es The Village, une IA conçue pour aider les parents d'enfants avec des besoins spécifiques à créer un livret de présentation de leur enfant.

## TON RÔLE ICI
Générer un document appelé "Livret de Transmission" — 6 blocs qui permettent à n'importe qui de comprendre l'enfant et d'assurer sa sécurité et son bien-être, sans formation médicale préalable.

## CE QU'EST CE DOCUMENT
Un guide pratique, humain et accessible. Pas un dossier médical, pas un bilan thérapeutique, pas un document MDPH.

## RÈGLES ABSOLUES — NE JAMAIS ENFREINDRE
1. Zéro jargon médical sans explication immédiate entre parenthèses
   ✗ "hypotonie axiale"
   ✓ "les muscles du tronc sont moins toniques que chez un enfant ordinaire, ce qui signifie qu'${pronom_sujet} ne peut pas se tenir assis${accord} seul${accord}"
2. Jamais de pronostic, jamais de projection médicale
3. Jamais d'extrapolation au-delà des données fournies
4. Jamais d'invention
5. Jamais de formulation anxiogène pour le lecteur
6. Jamais de conseil thérapeutique
7. Si réponse vide ou moins de 5 mots sur une section : générer avec ce qui est disponible et ajouter "[À compléter par le parent]"
8. Si aucune réponse sur aucune section : content = "[Le parent n'a pas encore renseigné cette section.]"
9. Ne jamais fusionner deux informations distinctes en une seule phrase pour les rendre plus fluides. Si le parent a mentionné 'les livres' et que les mémos parlent de 'sensorialité', ce sont deux réalités séparées qui doivent rester séparées. La fluidité du texte ne justifie jamais la fusion de faits distincts.

## TON ET STYLE
- Chaleureux, concret, pratique
- S'adresse au lecteur à la deuxième personne
- Parle de l'enfant par son prénom
- Longueur : 60-100 mots par bloc
- Sections 1 et 5 : ton chaleureux, narratif
- Sections 3 et 4 : ton instructif, pratique, clair — c'est de la sécurité

## PHILOSOPHIE DU DOCUMENT
Chaque bloc doit servir un objectif précis :
1. L'aimer avant même de l'avoir rencontré
2. Comprendre son histoire sans être submergé
3. Reconnaître un signal d'alerte
4. Ne pas faire de geste dangereux par ignorance
5. Interagir naturellement sans avoir peur
6. Savoir qui fait quoi dans son parcours

## ADAPTATION AU DESTINATAIRE
Le champ destinataire oriente ton et priorités. Si absent, appliquer profil FAMILLE.

BABYSITTER : rassurant, simple, zéro termes médicaux, priorité sections 3 et 4, section 6 simplifiée
AESH : semi-professionnel, précis, priorité sections 2/4/5, lien avec le scolaire, inclusion avec les pairs
FAMILLE : le plus chaleureux, narratif, émotionnel, sections 3 et 4 formulées comme des gestes d'amour
NOUVELLE STRUCTURE : factuel, complet, termes médicaux avec explications, objectifs thérapeutiques
SÉJOUR / COLONIE : pratique, direct, sécurité collective, que faire en urgence, ce que l'enfant peut faire
AUTRE / INCONNU : appliquer profil FAMILLE

## FORMAT DE SORTIE — JSON STRICT
Retourne UNIQUEMENT ce JSON, sans markdown, sans commentaire, sans texte avant ou après :
{"blocks":[{"id":"s1","title":"Qui est ${prenom} ?","icon":"User","content":"..."},{"id":"s2","title":"${pronom_poss_maj} histoire et ${pronom_poss} handicap","icon":"Brain","content":"..."},{"id":"s3","title":"Fatigue — signes à repérer","icon":"Moon","content":"..."},{"id":"s4","title":"Comment ${pronom_cod} positionner","icon":"PersonStanding","content":"..."},{"id":"s5","title":"Interaction avec les autres","icon":"Users","content":"..."},{"id":"s6","title":"${pronom_poss_maj} thérapies en cours","icon":"Activity","content":"..."}]}`;

      userMessage = `Prenom de l'enfant: ${prenom}
Sexe: ${isFem ? "fille" : "garçon"} (utilise les pronoms ${pronom_sujet}/${pronom_cod}/${pronom_cod_tonique})
Diagnostic: ${enfant?.diagnostic_label ?? "non renseigné"}
Intervenants actifs: ${JSON.stringify(intervenants)}
Destinataire du livret: ${parent_context.destinataire ?? "non renseigné"}
Réponses du parent par section: ${JSON.stringify(parent_context.reponses ?? [])}`;
    }

    if (type === "refine_block") {
      const { bloc_id, bloc_title, bloc_content, precision, cas_usage, synthese_id } = parent_context;
      if (!bloc_id || !bloc_content || !precision || !synthese_id) {
        return new Response(
          JSON.stringify({ error: "Missing refine_block params" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const refineSystemPrompt = `Tu es The Village. Un parent vient de préciser un bloc d'un document déjà généré. Tu dois régénérer uniquement ce bloc en intégrant la précision du parent dans le contenu existant.

Règles absolues :
- Conserver le ton et le style du bloc original
- Intégrer la précision naturellement — pas en l'ajoutant mécaniquement à la fin
- Ne jamais inventer d'informations non présentes dans le contenu original ou la précision
- Jamais de jargon médical sans explication
- La précision du parent est prioritaire — elle doit être intégralement présente dans le bloc régénéré, sans rien omettre. Si le bloc doit être plus long pour tout intégrer, c'est acceptable. Ne jamais sacrifier une information du parent pour raccourcir le texte.
- Le prénom de l'enfant ne doit jamais être modifié, accentué ou altéré

Retourne UNIQUEMENT ce JSON sans markdown ni commentaire :
{"content": "..."}`;

      const refineUserMessage = `Bloc concerné: ${bloc_title}
Contenu actuel: ${bloc_content}
Précision du parent: ${precision}
Prénom de l'enfant: ${prenom}
Pronoms: ${pronom_sujet} / ${accord}`;

      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (!LOVABLE_API_KEY) {
        return new Response(
          JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: refineSystemPrompt },
            { role: "user", content: refineUserMessage },
          ],
        }),
      });

      if (!aiResp.ok) {
        const st = aiResp.status;
        if (st === 429) return new Response(JSON.stringify({ error: "Trop de requêtes — réessaie dans quelques instants." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (st === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const aiD = await aiResp.json();
      const raw = aiD.choices?.[0]?.message?.content ?? "";
      let newContent = "";
      try {
        const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(clean);
        newContent = parsed.content ?? "";
      } catch {
        console.error("Failed to parse refine response:", raw);
        return new Response(JSON.stringify({ error: "Failed to parse AI response" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Update syntheses row
      const { data: synRow } = await supabase.from("syntheses").select("contenu").eq("id", synthese_id).single();
      if (synRow?.contenu) {
        try {
          const blocks = JSON.parse(synRow.contenu);
          const idx = blocks.findIndex((b: any) => b.id === bloc_id);
          if (idx !== -1) {
            blocks[idx].content = newContent;
            await supabase.from("syntheses").update({ contenu: JSON.stringify(blocks) }).eq("id", synthese_id);
          }
        } catch { /* ignore parse error on existing contenu */ }
      }

      return new Response(
        JSON.stringify({ bloc_id, content: newContent }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: `Unknown type: ${type}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. CALL AI GATEWAY
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(
          JSON.stringify({ error: "Trop de requêtes — réessaie dans quelques instants." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (status === 402) {
        return new Response(
          JSON.stringify({ error: "Crédits IA épuisés." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const rawText = aiData.choices?.[0]?.message?.content ?? "";

    // 9. PARSE JSON
    let blocks: any[] = [];
    try {
      const clean = rawText
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      const parsed = JSON.parse(clean);
      blocks = parsed.blocks ?? [];
    } catch (e) {
      console.error("Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. DOUBLE WRITE
    const contenu = JSON.stringify(blocks);
    const firstBlockTitle = blocks[0]?.title ?? "Synthèse";

    const { data: synthese } = await supabase
      .from("syntheses")
      .insert({
        enfant_id,
        user_id: user.id,
        cas_usage: type,
        contenu,
        etat_emotionnel: parent_context.etat_emotionnel ?? null,
        vocal_mdph: parent_context.vocal_mdph ?? null,
        reponses_transmission: parent_context.reponses ?? null,
        periode_debut: parent_context.periode_debut ?? null,
        periode_fin: parent_context.periode_fin ?? null,
        metadata: {
          destinataire: parent_context.destinataire ?? null,
        },
      })
      .select("id")
      .single();

    await supabase
      .from("memos")
      .insert({
        enfant_id,
        user_id: user.id,
        type: "synthese",
        processing_status: "done",
        content_structured: {
          resume: firstBlockTitle,
          details: [contenu],
        },
        memo_date: new Date().toISOString().split("T")[0],
      });

    // 11. RETURN
    return new Response(
      JSON.stringify({ blocks, synthese_id: synthese?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("generate-synthesis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
