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
    let medicamentsData: any[] | null = null;
    let soinsData: any[] | null = null;
    let materielData: any[] | null = null;

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
      const cutoffDate = new Date();
      cutoffDate.setMonth(cutoffDate.getMonth() - 24);
      const cutoffStr = cutoffDate.toISOString().split("T")[0];

      const { data: memosData } = await supabase
        .from("memos")
        .select("content_structured, memo_date, type")
        .eq("enfant_id", enfant_id)
        .neq("type", "synthese")
        .gte("memo_date", cutoffStr)
        .order("memo_date", { ascending: false });
      memos = memosData ?? [];

      const { data: medData } = await supabase
        .from("medicaments")
        .select("nom, dosage, frequence, voie, instructions")
        .eq("enfant_id", enfant_id)
        .eq("actif", true);
      medicamentsData = medData;

      const { data: sData } = await supabase
        .from("soins")
        .select("nom, description, frequence, instructions")
        .eq("enfant_id", enfant_id)
        .eq("actif", true);
      soinsData = sData;

      const { data: matData } = await supabase
        .from("materiel")
        .select("nom, conseils, date_reception")
        .eq("enfant_id", enfant_id)
        .eq("actif", true);
      materielData = matData;
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
{"blocks":[{"id":"narrative","title":"Ce qui s'est passé","icon":"Sparkles","content":"texte narratif propre uniquement, sans signalement"}],"etat_emotionnel_resume":"une phrase courte et neutre, maximum 8 mots, décrivant ce que le parent cherchait dans ce remontant — ton factuel et doux, jamais dramatique ni émotionnel, sans guillemets ni ponctuation finale. Exemples : voir où en est Selena / faire un point sur ces trois mois / prendre du recul sur la période","titre_archive":"4 à 6 mots, positifs, centrés sur l'enfant, évocateurs de cette période, jamais sur l'état émotionnel du parent, sans guillemets ni ponctuation finale. Exemples : Un mètre après l'autre / La curiosité comme moteur / Selena prend ses marques"}`;

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
      systemPrompt = `Tu es une assistante sociale expérimentée qui rédige des dossiers MDPH pour des familles d'enfants avec des besoins spécifiques.

## TON RÔLE EXACT

Tu prends les informations fournies par le parent et tu les transformes en textes administratifs prêts à coller dans le formulaire CERFA 15692. Tu rédiges à la place du parent, dans le registre que la CDAPH attend — factuel, précis, ancré dans la réalité documentée.

## CE QUE TU N'ES PAS

Tu n'es pas médecin. Tu ne poses pas de diagnostic. Tu ne connais pas les complications d'une maladie au-delà de ce qui est écrit dans les données fournies. Tu ne coches aucune case. Tu ne recommandes aucune prestation.

## HIÉRARCHIE DES SOURCES — OBLIGATOIRE

Les données sont organisées en trois niveaux. Tu les utilises dans cet ordre de priorité :

### NIVEAU 1 — Vocaux CERFA (priorité maximale)

Ce sont les réponses Q0–Q8 du parent pour ce dossier spécifique, et les mémos vocaux de la Synthèse Magique. C'est la voix directe du parent. Ces informations priment sur tout le reste.

### NIVEAU 2 — Comptes rendus médicaux (type: document)

Tu les lis comme une assistante sociale — tu comprends ce qui est pertinent pour le dossier, tu le reformules dans un registre administratif accessible. Tu ne copies jamais le jargon médical. Tu ne vas jamais au-delà de ce qui est écrit. Tu ne cites pas la source dans le texte.

### NIVEAU 3 — Mémos de soins et notes (type: vocal, note, activite)

Ils donnent une image globale du quotidien de l'enfant. Utiles pour ancrer le texte dans la réalité concrète.

## RÈGLES ABSOLUES — JAMAIS ENFREINDRE

### 1. Interdiction d'utiliser tes connaissances générales

Ce que tu "sais" sur une pathologie, une mutation génétique, un médicament ou un équipement n'existe pas dans ce contexte.

- Tu ne sais pas quelles sont les complications d'une mutation génétique au-delà de ce qui est écrit dans les CRs fournis.

- Tu ne sais pas ce qu'un équipement fait en général — tu sais ce que les données disent qu'il fait.

- Exemple interdit : inférer des risques hémorragiques depuis le nom "COL4A1" si ce risque n'est pas écrit dans les données.

- Exemple correct : si un CR mentionne "surveillance des risques hémorragiques", tu peux écrire "Selena fait l'objet d'une surveillance médicale régulière en raison de sa pathologie."

### 2. Interdiction de requalifier un équipement

Décris l'équipement uniquement comme les données le décrivent.

- Si le Motilo est décrit comme outil de déplacement dans les données → c'est un outil de déplacement.

- Ne jamais le renommer "appareil de verticalisation" si ce n'est pas écrit.

### 3. Interdiction de généraliser depuis un événement ponctuel

Un événement documenté une fois n'est pas une constante.

- "sans chute de tête" dans un mémo ne crée pas un "risque de chutes".

- Un stage ponctuel n'est pas une séance régulière.

- "utilisé en séance" n'est pas "utilisé quotidiennement".

### 4. Interdiction d'inférer des besoins non documentés

Si un besoin n'est pas mentionné dans les données (aucun des trois niveaux), il n'existe pas pour ce dossier.

- "habillage" absent des données → aucune mention de l'habillage.

### 5. Nombre d'intervenants — chiffre exact uniquement

Utiliser uniquement le chiffre exact fourni dans la liste des intervenants. Jamais d'estimation.

### 6. Première personne singulière dans aidant_f

Jamais "nous", jamais "les parents". Toujours "je".

"En tant que [declarant_lien] de [prenom], j'assure..."

### 7. Zéro prescription

Décrire le besoin. La commission formule la réponse.

- Interdit : "une AESH est requise", "un SESSAD doit être mis en place"

- Correct : décrire la situation concrète, laisser la commission conclure.

### 8. Ne pas citer les sources dans le texte

Pas de "selon le mémo du [date]", pas de "d'après le compte rendu de". Intégrer l'information naturellement dans le texte administratif.

### 9. Quantification uniquement si présente dans les données

Ne jamais inventer de chiffres.

### 10. Zéro bullet points dans les textes à coller

### 11. Jamais : "indispensable", "crucial", "nous", "les parents", "il semblerait que", "probablement"

## SIGNALEMENTS OBLIGATOIRES

Si donnée absente, insérer exactement :

- [DONNÉES CHIFFRÉES MANQUANTES — Ajoute la fréquence ou la durée dans tes mémos.]

- [FRÉQUENCE DES SÉANCES NON RENSEIGNÉE — Ajoute-la dans tes mémos.]

- [FRAIS ENGAGÉS NON RENSEIGNÉS — Mentionne-les dans la section B1 du formulaire.]

- [TIERCE PERSONNE NON PRÉCISÉE — Décris qui intervient et combien d'heures par semaine.]

Les signalements DOIVENT être placés uniquement dans le champ 'signal' du bloc JSON concerné. Ils ne doivent JAMAIS apparaître dans le champ 'content'. Le champ 'content' contient uniquement le texte narratif propre, sans aucun signalement. Le champ 'signal' contient le signalement exact si une donnée manque, null sinon.

## REGISTRES DE GÉNÉRATION

REGISTRE A — "Première demande" : pose le contexte depuis le début. Pour le bloc zone_b, compare aux capacités d'un enfant ordinaire du même âge — uniquement sur la base des observations documentées.

REGISTRE B — "Renouvellement" ou "Évolution" : accent sur les changements documentés. Justifie le maintien des droits souhaités.

## FORMAT GÉNÉRAL

- Troisième personne pour l'enfant

- Première personne singulière pour le déclarant dans aidant_f

- Ton : administratif avec ancrage humain — factuel, précis, sans pathos ni superlatifs

## LONGUEUR PAR BLOC

- zone_b : pas de limite stricte — couvre 4 paragraphes :
  § 1 Introduction : diagnostic, tableau clinique, impact global (3-4 phrases)
  § 2 Besoins pour la vie à domicile : actes du quotidien, aide humaine nécessaire, équipements utilisés
  § 3 Besoins pour se déplacer : mobilité, autonomie, équipements, dépendance aux tiers
  § 4 Besoins pour la vie sociale : communication, relations, activités, interactions
  Chaque paragraphe est aussi long que les données le permettent. Si données absentes → signalement.

- scolarite_c3 : 80–100 mots maximum. Décrire la situation scolaire actuelle ET le futur anticipé. Si l'enfant n'est pas encore scolarisé·e, décrire le travail préparatoire en cours et ce qui est prévu.

- scolarite_e2 : 60–80 mots maximum. Décrire les demandes liées à la scolarité même si l'entrée à l'école est à venir — se concentrer sur ce qui sera nécessaire quand la scolarisation commencera.

- aidant_f : 100–120 mots maximum

## FORMAT DE SORTIE — JSON STRICT

Retourne UNIQUEMENT ce JSON, sans markdown, sans commentaire :

{"blocks":[

  {"id":"zone_b","title":"Vie quotidienne, suivi et équipement","cerfa_ref":"Zone libre B · Page 8","cerfa_ref_complementaire":"Cases B2 · Page 6 — à cocher par le parent","icon":"Home","content":"texte narratif propre uniquement, sans signalement","editorial_note":"Dans la section B2 (page 6), coche les cases correspondant aux actes où ${prenom} a besoin d'aide — The Village ne les coche pas pour toi.","signal":null},

  {"id":"scolarite_c3","title":"Vie scolaire — renseignements","cerfa_ref":"Zone libre C3 · Page 12","cerfa_ref_complementaire":null,"icon":"BookOpen","content":"texte narratif propre uniquement, sans signalement","editorial_note":null,"signal":null},

  {"id":"scolarite_e2","title":"Demande scolaire","cerfa_ref":"Zone libre E2 · Page 17","cerfa_ref_complementaire":null,"icon":"BookOpen","content":"texte narratif propre uniquement, sans signalement","editorial_note":"Dans la section E1 (page 17), coche les droits souhaités — The Village ne les coche pas pour toi.","signal":null},

  {"id":"aidant_f","title":"Situation de l'aidant","cerfa_ref":"Zone libre F · Pages 19–20","cerfa_ref_complementaire":null,"icon":"Briefcase","content":"texte narratif propre uniquement, sans signalement","editorial_note":null,"signal":null}

]}`;

      userMessage = `DÉCLARANT
Prénom : ${parent_context.declarant_prenom ?? "non renseigné"}
Lien avec l'enfant : ${parent_context.declarant_lien ?? "non renseigné"}

PROFIL DE L'ENFANT
Prénom : ${prenom}
Sexe : ${isFem ? "fille" : "garçon"} (pronoms : ${pronom_sujet}/${pronom_cod})
Diagnostic : ${enfant?.diagnostic_label ?? "non renseigné"}

RÉPONSES DU PARENT
Q0 — Déclarant : ${parent_context.declarant_prenom ?? "non renseigné"} (${parent_context.declarant_lien ?? "non renseigné"})
Q1 — Type de demande : ${parent_context.type_demande ?? "non renseigné"}
Q2 — Vie quotidienne de l'enfant : ${parent_context.vie_quotidienne ?? "non renseigné"}
Q3 — Organisation soins et situation pro : ${parent_context.organisation_soins ?? "non renseigné"}
Q4 — Scolarisation : ${parent_context.scolarisation ?? "non renseigné"}
Q4 — Précisions scolarisation : ${parent_context.scolarisation_details ?? "non renseigné"}
Q5 — Projet : ${parent_context.projet ?? "non renseigné"}
Q6 — Champ libre : ${parent_context.champ_libre ?? "rien à ajouter"}
Q7 — Certificat : ${parent_context.certificat_etat ?? "non renseigné"}
Q7 — Contenu certificat : ${parent_context.certificat_vocal ?? "non disponible"}

DONNÉES DE L'APPLICATION
Intervenants actifs (${intervenants?.length ?? 0}) :
${JSON.stringify(intervenants?.map((i: any) => ({
  specialite: i.specialite,
  structure: i.structure,
  frequence: i.frequence ?? "fréquence non renseignée"
})) ?? [])}

Médicaments (${medicamentsData?.length ?? 0}) :
${JSON.stringify(medicamentsData?.map((m: any) => ({
  nom: m.nom,
  dosage: m.dosage ?? "non renseigné",
  frequence: m.frequence ?? "non renseignée"
})) ?? [])}

Soins (${soinsData?.length ?? 0}) :
${JSON.stringify(soinsData?.map((s: any) => ({
  nom: s.nom,
  frequence: s.frequence ?? "non renseignée",
  description: s.description ?? ""
})) ?? [])}

Matériel (${materielData?.length ?? 0}) :
${JSON.stringify(materielData?.map((m: any) => ({
  nom: m.nom,
  conseils: m.conseils ?? ""
})) ?? [])}

Mémos des 24 derniers mois (${memos?.length ?? 0}) :
${JSON.stringify(memos?.map((m: any) => ({
  date: m.memo_date,
  resume: m.content_structured?.resume ?? "",
  details: m.content_structured?.details ?? [],
  a_retenir: m.content_structured?.a_retenir ?? ""
})) ?? [])}

BLOCS À GÉNÉRER
Toujours générer ces 4 blocs : zone_b, scolarite_c3, scolarite_e2, aidant_f`;
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
10. Ne jamais présenter une information comme la cause ou la conséquence d'une autre sauf si le parent l'a explicitement dit. Les liens entre les faits sont autorisés quand ils sont des observations naturelles ('elle aime les livres et la musique'). Ils sont interdits quand ils deviennent des inférences ('parce que', 'ce qui explique', 'grâce à', 'c'est pourquoi') non formulées par le parent.

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
{"blocks":[{"id":"s1","title":"Qui est ${prenom} ?","icon":"User","content":"texte narratif propre uniquement, sans signalement"},{"id":"s2","title":"${pronom_poss_maj} histoire et ${pronom_poss} handicap","icon":"Brain","content":"texte narratif propre uniquement, sans signalement"},{"id":"s3","title":"Fatigue — signes à repérer","icon":"Moon","content":"texte narratif propre uniquement, sans signalement"},{"id":"s4","title":"Comment ${pronom_cod} positionner","icon":"PersonStanding","content":"texte narratif propre uniquement, sans signalement"},{"id":"s5","title":"Interaction avec les autres","icon":"Users","content":"texte narratif propre uniquement, sans signalement"},{"id":"s6","title":"${pronom_poss_maj} thérapies en cours","icon":"Activity","content":"texte narratif propre uniquement, sans signalement"}]}`;

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
      var etatResume = parsed.etat_emotionnel_resume ?? null;
      var titreArchive = parsed.titre_archive ?? null;
    } catch (e) {
      console.error("Failed to parse AI response:", rawText);
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response", raw: rawText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9b. REVIEW PASS (mdph only)
    if (type === "mdph") {
      const reviewSystemPrompt = `Tu es un relecteur spécialisé en dossiers MDPH. Tu reçois des blocs de texte CERFA générés pour le dossier d'un enfant. Tu corriges uniquement les violations listées.

TERMES AUTORISÉS — NE JAMAIS CORRIGER :
- Tous les termes présents dans le diagnostic : ${enfant?.diagnostic_label ?? ""}
- Tous les termes que le parent a lui-même utilisés dans ses vocaux (réponses Q0-Q8 et mémos vocaux)

VIOLATIONS À CORRIGER :
1. Jargon médical issu des comptes rendus professionnels que le parent n'a pas utilisé :
- "maintien céphalique" → "maintien de la tête"
- "hypotonie axiale" → "faiblesse musculaire du tronc"
- Tout terme médical latin ou technique absent du diagnostic et des vocaux parentaux

2. "nous", "notre", "les parents" → "je", "ma", "mon" dans tous les blocs SAUF scolarite_c3 et scolarite_e2

3. Prescriptions :
"est nécessaire pour compenser", "est envisagé", "sont nécessaires pour" → reformuler en description de besoin sans prescrire la solution

4. Assertions médicales de risque absentes du diagnostic_label et non dictées par le parent en Q8 :
→ supprimer ou reformuler en "fait l'objet d'un suivi médical spécialisé"

5. Superlatifs et jugements de valeur sur la pathologie :
"complexe", "lourd", "sévère" appliqués à la pathologie → supprimer l'adjectif, garder le fait.
Exemple : "pathologie génétique complexe" → "pathologie génétique"

RÈGLES :
- Ne pas réécrire ce qui est correct
- Ne pas ajouter d'informations
- Conserver les signalements [EN MAJUSCULES] tels quels
- Retourner le JSON complet avec blocs corrigés

FORMAT DE SORTIE — JSON STRICT identique à l'entrée, sans markdown ni commentaire.`;

      const reviewUserMessage = `Voici les blocs générés à relire et corriger :\n${JSON.stringify({ blocks })}`;

      try {
        const reviewResponse = await fetch(
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
                { role: "system", content: reviewSystemPrompt },
                { role: "user", content: reviewUserMessage },
              ],
            }),
          }
        );

        if (reviewResponse.ok) {
          const reviewData = await reviewResponse.json();
          const reviewRaw = reviewData.choices?.[0]?.message?.content ?? "";
          try {
            const reviewClean = reviewRaw.replace(/```json/g, "").replace(/```/g, "").trim();
            const reviewParsed = JSON.parse(reviewClean);
            if (reviewParsed.blocks) {
              blocks = reviewParsed.blocks;
            }
          } catch (e) {
            console.error("Review parse failed, using raw blocks:", e);
          }
        } else {
          console.error("Review call failed with status:", reviewResponse.status);
        }
      } catch (e) {
        console.error("Review call error, using raw blocks:", e);
      }
    }

    // 10. DOUBLE WRITE
    const contenu = type === "pick_me_up"
      ? JSON.stringify({ blocks, etat_emotionnel_resume: etatResume ?? null, titre_archive: titreArchive ?? null })
      : JSON.stringify(blocks);
    const firstBlockTitle = blocks[0]?.title ?? "Synthèse";

    const { data: synthese } = await supabase
      .from("syntheses")
      .insert({
        enfant_id,
        user_id: user.id,
        cas_usage: type,
        contenu,
        titre: type === "pick_me_up" ? (titreArchive ?? null) : null,
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
