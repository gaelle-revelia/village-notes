# Knowledge File — The Village
*Version 6 — 06/03/2026*

---

## Vision produit

The Village transforme les notes, comptes rendus et observations quotidiennes du parent en une vision structurée et longitudinale du parcours médico-thérapeutique d'un enfant à besoins spécifiques, sans se substituer à l'autorité clinique.

L'IA est un facilitateur invisible. Le produit, c'est la mémoire organisée du chemin parcouru.

---

## Stack technique

- **Frontend** : React + TypeScript via Lovable
- **Backend** : Supabase (DB + Auth + Edge Functions + RLS)
- **Email** : Resend — domaine the-village.app vérifié, **opérationnel** ✅
- **URL app** : https://thevillage-app.lovable.app
- **Domaine** : the-village.app (OVH)
- **Repo GitHub** : pinné avant chaque session risquée
- **Modèle IA** : `google/gemini-3-flash-preview` via Lovable AI gateway (modèle unique pour toutes les edge functions)

---

## Rôles utilisateurs

- **owner** : parent principal, accès complet
- **coparent** : accès complet (lecture + écriture)
- **famille** : accès lecture seule
- **Admin (Gaëlle — dev only)** : accès technique. Ne pas exposer dans l'UI.

> Pas de rôle professionnel de santé dans le MVP.

---

## Vocabulaire — termes validés

| Terme à utiliser | Terme banni | Contexte |
|---|---|---|
| **Membre du village** | "Intervenant" | Désigne toute personne dans l'entourage de l'enfant |
| **Mon Village** | "Mes intervenants" | Label de la section gestion des membres |
| **Professionnel** | "Pro", "Soignant" | Type de membre (type = 'pro') |
| **Famille** | — | Type de membre (type = 'famille') |
| **Étape** | "Évènement", "Milestone" | Type de contenu timeline pour les faits marquants |
| **Mémo** | — | Enregistrement vocal ou note transcrite par IA |
| **Note** | — | Saisie texte libre |
| **Document** | — | PDF, compte-rendu, ordonnance |
| **Activité** | — | Session chronométrée (type = 'activite' dans memos) |
| **Synthèse** | "Résumé IA", "Rapport" | Document généré par la Synthèse Magique (type = 'synthese') |
| **Transmission** | "Livret d'accueil" | Cas d'usage Synthèse Magique — document de présentation de l'enfant |
| **Domaine** | "Domaine thérapeutique" | Catégorie de l'activité ou du mémo |
| **Axe de développement** | "Objectif", "Goal", "Target" | Ce vers quoi on travaille — Carte de Progression ← NOUVEAU |
| **Pépite** | "Progrès", "Avancée", "Score" | Mémo automatiquement associé à un axe — Carte de Progression ← NOUVEAU |
| **Faire évoluer** | "Supprimer", "Effacer" | Modifier le label d'un axe — Carte de Progression ← NOUVEAU |
| **Axe silencieux** | "Axe bloqué", "Axe en échec" | Axe sans pépite récente — jamais péjoratif ← NOUVEAU |

---

## Pages et navigation

- `/` → redirige vers `/timeline` si connecté, sinon `/login`
- `/login` → authentification (email + password via Supabase Auth)
- `/onboarding` → parcours d'onboarding 5 étapes (nouveaux utilisateurs)
- `/onboarding-invite` → onboarding 6 étapes pour utilisateurs invités (token UUID requis) ✅
- `/timeline` → page principale. Timeline inversée : le plus récent en bas.
- `/memo/:id` → détail d'un mémo
- `/nouvelle-note` → saisie texte complète (note de rendez-vous, structuration IA complète)
- `/record` → enregistrement vocal / saisie rapide texte (mode text_quick)
- `/village` → gestion des membres du village
- `/profile` → profil utilisateur + profil enfant + **Carte de Progression** ← NOUVEAU
- `/vocabulaire` → gestion du lexique phonétique de l'enfant
- `/settings` → paramètres
- `/outils` → hub outils (grille bento 2×2)
- `/outils/activites` → liste des activités de l'enfant
- `/outils/activites/creer` → formulaire création activité
- `/outils/activites/:id/chrono` → chrono temps réel
- `/outils/activites/:id/manuel` → saisie manuelle post-séance
- `/outils/synthese` → Synthèse Magique *(à builder)*

Navigation : bottom nav 4 onglets — Accueil (`/timeline`), Selena (`/profile`), Outils (`/outils`), Explorer.

---

## Design system

> ⚠️ ANCIEN DESIGN SYSTEM DEPRECATED — NE PLUS UTILISER
> - Background #F4F1EA → remplacé par le dégradé ci-dessous
> - Police Crimson Text → remplacée par Fraunces
> - Police Inter → remplacée par DM Sans
> - Primary color #6B8CAE → supprimé
> - Cards blanches opaques → remplacées par liquid glass

**Fond global**
```css
background: linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%);
min-height: 100vh;
```
Ne pas ajouter d'autres couleurs de fond sur les pages. Tous les parents de composants doivent être transparents pour que le backdrop-filter fonctionne.

**Typographie**
- Titres : `Fraunces` (serif, weight 600)
- Corps : `DM Sans` (weight 300 / 400 / 500 / 600)
- Texte principal : `#1E1A1A`
- Texte muted : `#9A9490`

**Couleurs domaines**

| Nom | Hex | Domaine | Description pédagogique |
|---|---|---|---|
| Corail | `#E8736A` | Moteur & physique | Tout ce qui touche au corps : tonus, posture, motricité, déplacements |
| Lavande | `#8B74E0` | Cognitif & psychomoteur | Compréhension, attention, mémoire, coordination gestes-pensée |
| Menthe | `#44A882` | Sensoriel & communication | Réactions aux sons, au toucher, au regard, langage et expression |
| Abricot | `#E8A44A` | Bien-être & émotionnel | Humeur, fatigue, sommeil, appétit, confort au quotidien |
| Gris | `#8A9BAE` | Médical & administratif | Rendez-vous médicaux, bilans, MDPH, matériel |
| Or | `#E8C84A` | — | Réservé aux Étapes (faits marquants) |

**Avatars intervenants — dégradés + icônes Lucide**

| Spécialité (keywords) | Dégradé | Icône |
|---|---|---|
| Kiné, kinésithérapeute | `#E8736A → #E8845A` | `Activity` |
| Psychomotricité, psychomotricien | `#8B74E0 → #5CA8D8` | `Brain` |
| Ergothérapie, ergothérapeute | `#44A882 → #4E96C8` | `Hand` |
| Parent, famille, Papa, Maman | `#E8736A → #C85A8A` | `Heart` |
| Médecin, Dr, neuropédiatre, MPR | `#8A9BAE → #6B7F94` | `Stethoscope` |
| Orthophonie, orthophoniste | `#44A882 → #8B74E0` | `MessageCircle` |
| Default | `#8A9BAE → #6B7F94` | `User` |

**Liquid glass — recettes CSS**

Cards standard (TimelineCard, MemoResult sections) :
```css
background: rgba(255,255,255,0.38);
backdrop-filter: blur(16px) saturate(1.6);
-webkit-backdrop-filter: blur(16px) saturate(1.6);
border: 1px solid rgba(255,255,255,0.85);
border-radius: 16px;
box-shadow: 0 4px 24px rgba(139,116,224,0.08), 0 1px 4px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9);
```

Card Étape (milestone) :
```css
background: rgba(255,248,220,0.55);
border: 1px solid rgba(232,200,74,0.35);
box-shadow: 0 4px 24px rgba(232,200,74,0.12), inset 0 1px 0 rgba(255,255,255,0.9);
```

Card Document :
```css
background: rgba(240,243,247,0.55);
border: 1px solid rgba(138,155,174,0.25);
```

Card Activité :
```css
background: rgba(232,239,255,0.45);
border: 1px solid rgba(139,116,224,0.2);
```

Card Axe de Progression (Carte de Progression) ← NOUVEAU :
```css
background: rgba(255,255,255,0.38);
backdrop-filter: blur(16px) saturate(1.6);
border: 1px solid rgba(255,255,255,0.85);
border-radius: 18px;
border-left: 3px solid [couleur de l'axe];
box-shadow: 0 4px 20px rgba(139,116,224,0.07), inset 0 1px 0 rgba(255,255,255,0.9);
```

Bottom nav :
```css
background: rgba(255,255,255,0.55);
backdrop-filter: blur(20px) saturate(1.5);
-webkit-backdrop-filter: blur(20px) saturate(1.5);
border-top: 1px solid rgba(255,255,255,0.65);
box-shadow: 0 -2px 12px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.8);
```

Search bar :
```css
background: rgba(255,255,255,0.45);
backdrop-filter: blur(12px) saturate(1.4);
border: 1px solid rgba(255,255,255,0.65);
border-radius: 14px;
box-shadow: 0 2px 8px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.7);
```

Slide-in panels (Mon Village, Profil menu) :
```css
background: rgba(255,255,255,0.85);
backdrop-filter: blur(20px) saturate(1.5);
border-left: 1px solid rgba(255,255,255,0.65);
box-shadow: -4px 0 24px rgba(0,0,0,0.08);
```

FAB :
```css
background: linear-gradient(135deg, #E8736A, #8B74E0);
box-shadow: 0 6px 20px rgba(139,116,224,0.4);
border-radius: 50%;
width: 46px; height: 46px;
```

Bouton principal (Enregistrer, Confirmer) :
```css
background: linear-gradient(135deg, #E8736A, #8B74E0);
color: white; border-radius: 14px;
```

---

## Domaines — sélecteur dans MemoResult

Les 5 dots sont toujours visibles. Tap = toggle actif/inactif.

- **Inactif** : transparent, border 2px couleur domaine, opacity 0.35
- **Actif** : fond couleur domaine, box-shadow 0 0 0 5px [couleur à 22% opacité]
- Label sous chaque dot (9px) : Moteur · Cognitif · Sensoriel · Bien-être · Médical
- Bouton ⓘ "Comment choisir un domaine ?" → popup pédagogique avec description de chaque domaine

---

## Composants clés

**TimelineCard — structure JSX exacte**

```
Ligne 1 (card-meta) : flex, justify-between, align-center
  LEFT : flex, align-center, gap 7px
    - Type badge (Vocal / Note / Étape / Document / Activité / SYNTHÈSE) — 9px uppercase
    - Separator 1px
    - Domain dots : 1 à 3 cercles 7px, couleur domaine
    - Separator 1px
    - Avatar intervenant 20px + prénom 11px (si mémo/note/document)
  RIGHT :
    - Date : DM Sans 10px, #9A9490

Ligne 2 :
    - Résumé : DM Sans 14px, #1E1A1A, line-height 1.45, 1 phrase max

Type activite (spécifique) :
    - Titre Fraunces 16px bold
    - Stats : durée + distance Fraunces 16px bold avec labels 10px gris
```

**Dot timeline**
- Mémo / Note : 11px, creux, border 2.5px couleur domaine
- Étape : 16px, plein or (#E8C84A)
- Document : 13px, creux, border 2px gris (#8A9BAE)
- Activité : 11px, plein violet (#8B74E0), box-shadow 0 0 0 3px rgba(139,116,224,0.24)
- **Synthèse : symbole ✦ 11px, couleur #8B74E0, radiance lavande** ← NOUVEAU
```css
.synthese-rail-marker {
  font-size: 11px;
  color: #8B74E0;
  filter: drop-shadow(0 0 4px rgba(139,116,224,0.7))
          drop-shadow(0 0 8px rgba(139,116,224,0.35));
}
```

**TimelineLine**
- Ligne verticale 1.5px, dégradé corail → lavande → menthe, opacité 0.4

**BottomNav**
- Liquid glass (rgba(255,255,255,0.55) + backdrop-filter blur 20px)
- Border-top rgba(255,255,255,0.65)
- 4 icônes Lucide + label

---

## Types de contenu timeline

| Type | Badge | Dot | Card |
|---|---|---|---|
| **Mémo vocal** | 🎙 Vocal (lavande) | 11px couleur domaine | Liquid glass standard |
| **Note** | ✏️ Note (menthe) | 11px couleur domaine | Liquid glass standard |
| **Étape** | ⭐ Étape (or) | 16px or plein | Liquid glass dorée rgba(255,248,220,0.55) |
| **Document** | 📄 Document (gris) | 13px gris creux | Liquid glass grise rgba(240,243,247,0.55) |
| **Activité** | 🏃 Activité (violet) | 11px violet plein | rgba(232,239,255,0.45) border violet |
| **Synthèse** | ✏ SYNTHÈSE (lavande #8B74E0) | ✦ radiance lavande | Liquid glass standard |

**Card Synthèse — meta-row :**
```
[dots] | [separator] | [✏ SYNTHÈSE badge lavande] | [separator] | [avatar + prénom parent] | [date]
```

| Moteur | Exemple de titre affiché |
|---|---|
| Pick-me-up | "Remontant · Fév 2026" |
| MDPH | "Dossier MDPH · Renouvellement" |
| RDV Briefing | "Briefing RDV · Dr. Fontaine" |
| Transmission | "Transmission · Crèche Les Petits Pas" |

---

## Filtre timeline

Icône `SlidersHorizontal` + dot violet si filtre actif. Bottom sheet (Drawer vaul) avec pills :

| Étiquette | Types filtrés |
|---|---|
| Tous | — (défaut) |
| Rendez-vous | vocal + note |
| Activités | activite |
| Documents | document |
| Événements | evenement |
| **Synthèses** | **synthese** ← NOUVEAU |

- Sélection multiple, filtre appliqué en temps réel
- "Tous" déselectionne tout le reste et vice versa
- Bouton "Réinitialiser" visible si filtre actif
- Filtrage en mémoire (pas de nouveau fetch)

---

## Schéma BDD — table `memos` (content_structured)

**Mémos standards (voice + text) :**
```json
{
  "resume": "Kiné — appui ventral travaillé au sol",
  "details": ["observation 1", "observation 2"],
  "a_retenir": ["point actionnable 1"],
  "tags": ["Moteur", "Sensoriel"],
  "intervenant_detected": "Marie"
}
```

> ⚠️ `suggestions` est déprécié → remplacé par `a_retenir`. Fallback rétrocompatible en lecture : `a_retenir || suggestions`. À la première édition, `suggestions` est supprimé du JSON.

**Mémos text_quick :**
```json
{
  "resume": "Ergo — transvasement lentilles au sol",
  "details": ["texte brut saisi par le parent"],
  "a_retenir": null,
  "tags": null,
  "intervenant_detected": null,
  "mode": "text_quick"
}
```

**Mémos activité :**
```json
{
  "resume": "Motilo — 06:19 / 3 metres",
  "notes": "Note optionnelle",
  "tags": ["Moteur"]
}
```

**Tags — valeurs normalisées (avec majuscule)**
- `"Moteur"` → Corail · `"Cognitif"` → Lavande · `"Sensoriel"` → Menthe
- `"Bien-être"` → Abricot · `"Médical"` → Gris · `"Administratif"` → Gris

> Ne pas utiliser "Psychomotricité" comme tag — c'est un type d'intervenant, pas un domaine.

---

## Rendu `MemoResult.tsx` — mode `text_quick`

Quand `content_structured.mode === "text_quick"` :
- **Résumé** : affiché et éditable normalement
- **Détails** : `details[0]` affiché comme textarea unique, label "VOTRE NOTE", éditable
- **À retenir** : masqué si vide → lien discret "+ Ajouter des points à retenir" qui révèle le champ au tap
- **Domaines** : masqués si vides → lien discret "+ Ajouter des domaines" qui révèle le sélecteur au tap
- **Tags** : masqués si vides → lien discret "+ Ajouter des tags" qui révèle l'input au tap

---

## Deux chemins de saisie texte

| Aspect | `/nouvelle-note` | `/record` → "Saisir en texte" |
|---|---|---|
| Mode | `text` | `text_quick` |
| Type mémo | `note` | `note` |
| Date custom | Oui | Non (date du jour) |
| Structuration IA | Complète | Résumé uniquement |
| Résultat | `/memo-result/:id` (full page) | `MemoResultView` inline |
| Intervenant | SearchPicker (filtre actif=true) | IntervenantPicker (filtre actif=true) |

---

## Schéma BDD — table `intervenants`

```sql
id           uuid
enfant_id    uuid
nom          text
specialite   text  -- aussi utilisé pour la relation famille (ex: "Papa")
type         text  -- 'pro' | 'famille' (DEFAULT 'pro')
actif        boolean -- DEFAULT true (jamais supprimé, juste désactivé)
telephone    text  -- nullable
email        text  -- nullable
structure    text  -- nullable (ex: "Ty Yann", "Cabinet rue Yann d'Argent")
notes        text  -- nullable
photo_url    text  -- nullable
created_at   timestamptz
```

> Règle critique : ne jamais DELETE un membre. `actif = false` uniquement. Les mémos existants doivent toujours afficher l'intervenant même s'il est inactif.

---

## Schéma BDD — table `enfant_lexique`

```sql
id            uuid
enfant_id     uuid
mot_transcrit text   -- variante phonétique détectée
mot_correct   text   -- forme correcte attendue
source        text   -- 'onboarding_prenom' | 'onboarding_structure' | 'manual'
created_at    timestamptz
```

> `onboarding_prenom` : jamais affiché dans l'UI. Le lexique appartient à l'enfant — partagé entre tous les membres du village.

---

## Schéma BDD — table `profiles`

```sql
id                   uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id              uuid NOT NULL UNIQUE
onboarding_completed boolean NOT NULL DEFAULT false
created_at           timestamptz NOT NULL DEFAULT now()
```

**RLS** : `user_id = auth.uid()` (FOR ALL)
**Usage** : flag posé à la fin de l'étape 4 (handleNSM). Vérifié au mount de `/onboarding` pour rediriger vers `/timeline` si déjà complété.

---

## Schéma BDD — table `syntheses`

```sql
id                    uuid primary key default gen_random_uuid()
enfant_id             uuid references enfants(id)
membre_id             uuid references membres(id)
cas_usage             text  -- 'pick_me_up' | 'mdph' | 'rdv_briefing' | 'rdv_presentation' | 'transmission'
periode_debut         date  -- null pour Transmission
periode_fin           date  -- null pour Transmission
detections            jsonb -- items présentés à la validation (null pour Transmission)
detections_validees   jsonb -- items confirmés par le parent (null pour Transmission)
contenu               text  -- document généré
etat_emotionnel       text  -- pick_me_up uniquement
vocal_mdph            text  -- transcription vocal guidé MDPH
reponses_transmission jsonb -- [{section, question, reponse, bloc_genere}] — Transmission uniquement
metadata              jsonb -- intervenant, rdv_date, type_demande_mdph, destinataire_transmission...
created_at            timestamptz default now()
```

---

## Champ MDPH sur profil enfant

```sql
-- À ajouter sur table enfants ou profiles
mdph_type_demande     text  -- 'premiere_demande' | 'renouvellement'
mdph_derniere_demande date
```

---

## Schéma BDD — Carte de Progression ← NOUVEAU

### Table `axes_developpement`

```sql
id           uuid PRIMARY KEY DEFAULT gen_random_uuid()
enfant_id    uuid REFERENCES enfants(id) ON DELETE CASCADE
label        text NOT NULL          -- dans les mots du parent, jamais reformulé par l'IA
couleur      text NOT NULL          -- hex couleur domaine (#E8736A / #8B74E0 / #44A882 / #E8A44A / #8A9BAE)
ordre        integer DEFAULT 0      -- position d'affichage (0, 1, 2)
actif        boolean DEFAULT true   -- false = archivé, jamais supprimé
created_at   timestamptz DEFAULT now()
updated_at   timestamptz DEFAULT now()
```

**RLS :**
```sql
-- SELECT : tous les membres du village
CREATE POLICY "axes_select" ON axes_developpement
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM enfant_membres
      WHERE enfant_membres.enfant_id = axes_developpement.enfant_id
      AND enfant_membres.membre_id = auth.uid()
    )
  );

-- INSERT/UPDATE : owner et coparent uniquement
CREATE POLICY "axes_write" ON axes_developpement
  FOR ALL USING (
    get_membre_role(enfant_id) IN ('owner', 'coparent')
  );
```

> **Règle critique** : les axes appartiennent à l'enfant, pas à un membre. Owner ET coparent peuvent créer et modifier. Famille : lecture seule.
> **Jamais de DELETE** — `actif = false` pour archiver. Les pépites associées restent consultables.

### Table `pepites`

```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
memo_id    uuid REFERENCES memos(id) ON DELETE CASCADE
axe_id     uuid REFERENCES axes_developpement(id) ON DELETE CASCADE
created_at timestamptz DEFAULT now()
UNIQUE(memo_id, axe_id)   -- contrainte d'unicité — pas de doublon
```

> **Architecture clé** : une pépite n'a PAS de champ texte propre. Le texte affiché = `content_structured.resume` du mémo source. L'IA fait de l'association, jamais de reformulation.

**RLS :**
```sql
CREATE POLICY "pepites_access" ON pepites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM memos m
      JOIN enfant_membres em ON em.enfant_id = m.enfant_id
      WHERE m.id = pepites.memo_id
      AND em.membre_id = auth.uid()
    )
  );
```

---

## Edge functions

| Fonction | Rôle | verify_jwt |
|---|---|---|
| `process-memo` | Transcription audio + structuration IA + détection pépites | false |
| `generate-lexique` | Génération variantes phonétiques | false |
| `suggest-icon` | Suggestion icône Lucide pour activité | false |
| `invite-member` | Envoi invitation email via Resend | false |
| `verify-invite-token` | Validation token invitation | false |
| `generate-synthesis` | Génération Synthèse Magique (4 moteurs) | false *(à créer)* |
| `generate-axes` | Génération axes depuis réponses onboarding Carte | false *(à créer)* |
| `backfill-pepites` | Association rétroactive mémos → axes (run once) | false *(à créer)* |

> `verify_jwt = false` sur toutes les fonctions — auth vérifiée manuellement via Bearer token dans chaque fonction.

---

## `process-memo` — pipeline de structuration

| Mode | Chemin | Comportement IA |
|---|---|---|
| `voice` | /record → mémo vocal | Transcription Gemini audio → structuration complète |
| `text` | /nouvelle-note | Texte brut → structuration complète |
| `text_quick` | /record → "Saisir en texte" | Texte brut → résumé uniquement |

**Règle de correction contextuelle :**
- Si le mot est utilisé grammaticalement comme verbe ou nom commun français → NE PAS corriger
- Si le contexte suggère un lieu ou nom propre → corriger
- En cas de doute → NE PAS corriger

**Fetch lexique** : toutes sources confondues (`onboarding_prenom` + `onboarding_structure` + `manual`), groupées par `mot_correct`.

**Mode `text_quick`** : appel simplifié, JSON `{ "resume": "..." }` uniquement. Modèle : `google/gemini-2.5-flash-lite`. Fallback si parse échoue : 60 premiers caractères du texte brut.

### Bloc pépites dans `process-memo` ← NOUVEAU

Après la structuration standard, si des axes actifs existent pour cet `enfant_id` :

```
1. Récupérer les axes actifs (actif = true) depuis axes_developpement
2. Envoyer à Gemini : content_structured.resume + liste des axes (id + label)
3. Gemini retourne : liste d'axe_id pertinents (0, 1 ou 2 max)
4. Pour chaque axe_id retourné : INSERT INTO pepites (memo_id, axe_id)
   ON CONFLICT (memo_id, axe_id) DO NOTHING
5. Si aucun axe pertinent : aucune action, aucun message
6. Si erreur Gemini sur ce bloc : log silencieux, ne pas bloquer le processing_status
```

**Prompt Gemini pour le bloc pépites :**
```
Tu analyses un mémo parental d'un enfant en situation de handicap.
Résumé du mémo : "[resume]"

Voici les axes de développement actifs :
[pour chaque axe: "- ID: [id] | Label: [label]"]

Réponds UNIQUEMENT avec un JSON : { "axe_ids": ["uuid1", "uuid2"] }
- Retourne 0, 1 ou 2 axe_ids maximum
- Retourne [] si le mémo n'est clairement lié à aucun axe
- N'invente pas de lien — seulement si c'est évident

Interdictions absolues :
- Aucun pronostic, aucun diagnostic
- Aucune comparaison à des normes
- Aucune interprétation médicale
```

---

## `generate-axes` — edge function ← NOUVELLE

**Déclenchement** : première ouverture de la Carte de Progression, après que le parent a répondu aux 3 questions guidées.

**Input :**
```json
{
  "enfant_id": "uuid",
  "prenom_enfant": "Selena",
  "reponse_1": "On travaille sur le tonus, qu'elle tienne bien assise...",
  "reponse_2": "Elle tient mieux sa tête, elle essaie d'attraper les jouets...",
  "reponse_3": "Qu'elle soit heureuse et qu'elle puisse se déplacer..."
}
```

**Output :**
```json
{
  "axes": [
    { "label": "Tonus axial et maintien", "couleur": "#E8736A" },
    { "label": "Communication et éveil cognitif", "couleur": "#44A882" },
    { "label": "Mobilité et autonomie", "couleur": "#8B74E0" }
  ]
}
```

**Règles prompt :**
- Les labels sont dans les mots du parent — jamais reformulés en jargon clinique
- Exactement 3 axes générés
- Couleurs assignées selon la logique domaine (corail = moteur, lavande = cognitif, menthe = sensoriel/communication, abricot = bien-être)
- Interdiction absolue : pronostic, diagnostic, vocabulaire médical non expliqué, comparaison à des normes

**Après validation par le parent :**
→ INSERT 3 lignes dans `axes_developpement`
→ Déclencher `backfill-pepites`

---

## `backfill-pepites` — edge function ← NOUVELLE

**Déclenchement** : une seule fois, au moment de la première validation des axes.

**Comportement :**
1. Récupérer tous les mémos existants de l'enfant (`processing_status = 'done'`)
2. Pour chaque mémo : même logique que le bloc pépites de `process-memo`
3. Insérer les associations dans `pepites` (`ON CONFLICT DO NOTHING`)
4. Poser le flag `backfill_done = true` sur l'enfant (champ à ajouter sur table `enfants`)
5. Exécution silencieuse en arrière-plan — ne pas bloquer l'UI

> Ne jamais relancer si `backfill_done = true`.

---

## Feature Carte de Progression — page `/profile` ← NOUVELLE

### Vue d'ensemble

La Carte de Progression est intégrée à la page `/profile` existante (onglet "Selena" dans la bottom nav). Elle remplace ou complète la section profil enfant — à valider au moment de l'implémentation selon l'état du `/profile` existant.

### Onboarding Carte (première ouverture)

Affiché si `axes_developpement` est vide pour cet enfant.

**Étapes :**
1. Écran de bienvenue narratif : "Je vais créer la carte de [prénom] en quelques questions."
2. **Question 1** : "Sur quoi [prénom] travaille en ce moment ?" — champ texte + bouton micro
3. **Question 2** : "Qu'est-ce que tu observes en ce moment chez [prénom] ?" — champ texte + bouton micro
4. **Question 3** : "S'il ne devait y avoir qu'une chose sur laquelle garder le cap pour [prénom] ?" — champ texte + bouton micro
5. Appel `generate-axes` → 3 axes affichés un par un, chacun éditable (label modifiable)
6. Bouton "C'est ma carte ✦" → INSERT axes + déclenche `backfill-pepites`

**Règles UX onboarding :**
- Chaque question peut être répondue vocalement (bouton micro) ou en texte
- Si réponse vocale : transcription via `process-memo` en mode `text_quick` avant envoi à `generate-axes`
- Barre de progression 4 dots (3 questions + validation)
- Pas de "bonne réponse" — le parent peut laisser une réponse courte

### Vue synthèse (état normal)

Affichée quand des axes existent. Structure :
- En-tête : avatar enfant + prénom + âge + badge "✦ Carte de Progression"
- Phrase d'intention : "Ce que [prénom] explore en ce moment — les moments notés au fil des jours forment sa carte."
- Section "Axes actifs" + lien "Archives"
- 3 cartes axes (voir specs card axe ci-dessous)

### Card axe — vue synthèse

```
[border-left couleur axe]
[dot couleur] [label axe]                    [chevron →]
[mini constellation — étoiles scintillantes]
```

- Mini constellation : canvas HTML 52px de hauteur, étoiles positionnées aléatoirement, animation twinkle indépendante par étoile (`opacity` uniquement — pas de scale)
- Axe vide (0 pépites) : rangée de 5 cercles pointillés + texte "Les pépites arrivent au fil des notes"
- Tap sur la card → vue détail axe

### Vue détail axe

Accessible depuis tap sur une card axe. Remplace la vue synthèse dans la même page.

```
[← Selena]
[badge domaine]
[titre axe en Fraunces 26px]
[nb pépites]

[grande constellation interactive — 200px]

[liste scrollable des pépites]
```

**Grande constellation :**
- Étoiles positionnées de façon organique dans le canvas
- Taille des étoiles proportionnelle à leur "poids" (récentes = grandes, anciennes = petites et transparentes)
- Tap sur une étoile → bottom sheet pépite
- Aucun score, aucun chiffre affiché, aucune barre de progression

**Bottom sheet pépite :**
```
[poignée]
[badge type mémo (Vocal / Note / Activité)]
[texte = content_structured.resume du mémo source — en italique Fraunces]
[avatar auteur · date]
[CTA] "Voir ce mémo dans la timeline"
[bouton secondaire] "Retirer de cet axe"
```

**Liste pépites :**
- Chaque item : ✦ + texte résumé (italique) + badge type + date
- Tap sur item = ouvre le même bottom sheet
- Tri : plus récente en premier

**Menu options axe (⋯) :**
- "Faire évoluer cet axe" → édition inline du label
- "Archiver cet axe" → `actif = false`, pépites conservées, axe déplacé dans "Archives"

### Page Archives

- Accessible via lien "Archives" depuis la vue synthèse
- Liste les axes archivés (`actif = false`) avec leurs pépites en lecture seule
- Pas de suppression possible

### Règles métier Carte de Progression

1. **Jamais de pronostic** — l'app ne prédit rien, même déguisé en "tendance"
2. **Jamais de diagnostic** — aucune validation médicale
3. **Jamais de comparaison** — ni normes, ni percentiles, ni "autres enfants"
4. **Jamais de jargon imposé** — les axes restent dans les mots du parent
5. **Jamais de sentiment d'échec** — aucun axe ne peut "échouer" dans l'interface
6. **Jamais de surveillance** — l'app n'évalue pas le parent
7. **Jamais de score** — ni pourcentage, ni barre de progression, ni compteur de pépites visible
8. **Jamais de deadline** — aucun axe n'a de date d'échéance
9. **Jamais de DELETE** sur les axes — archiver uniquement
10. **Texte pépite = résumé du mémo** — l'IA associe, ne reformule jamais

---

## Feature Multi-user & invitations ✅ OPÉRATIONNEL

- Table `enfant_membres` (junction) + fonction `get_membre_role(enfant_id)`
- RLS via `EXISTS` sur `enfant_membres`
- Edge function `invite-member` : génère token UUID, envoie email via Resend ✅
- Edge function `verify-invite-token` : valide le token
- **Redirect URL Supabase configurée** ✅ → routing vers `/onboarding-invite?token=UUID` fonctionnel
- **Flow end-to-end testé et validé** : email reçu → clic → `/onboarding-invite` → création mot de passe ✅

---

## Feature Lexique phonétique

- Table `enfant_lexique` — partagée entre tous les membres du village
- Edge function `generate-lexique` — deux modes :
  - **Onboarding** : `{ prenom_enfant, intervenants? }` → sources `onboarding_prenom` et `onboarding_structure`
  - **Manuel** : `{ mots: string[] }` → source `manual`
- Page `/vocabulaire` — sections "Lieux & structures" (`onboarding_structure`) + "Mots ajoutés" (`manual`)
- `onboarding_prenom` : jamais affiché dans l'UI
- Composants partagés : `VoiceBanner.tsx`, `VocabBlock.tsx` (collapse/expand, edit inline, ajout variante)
- Correction contextuelle dans `process-memo` : analyse sémantique pleine phrase (pas simple regex)
- Tous les membres du village ont accès et peuvent modifier le lexique

---

## Feature Activités suivies

### Tables BDD

```sql
-- activites
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
enfant_id uuid REFERENCES enfants(id) ON DELETE CASCADE
nom text NOT NULL
domaine text NOT NULL
icone text DEFAULT 'Activity'
track_temps boolean DEFAULT true
track_distance boolean DEFAULT false
unite_distance text DEFAULT 'metres'
actif boolean DEFAULT true
created_at timestamptz DEFAULT now()

-- sessions_activite
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
activite_id uuid REFERENCES activites(id) ON DELETE CASCADE
enfant_id uuid REFERENCES enfants(id) ON DELETE CASCADE
duree_secondes integer
distance numeric
notes text
created_at timestamptz DEFAULT now()
```

RLS sur les deux tables selon `get_membre_role(enfant_id)` :
- SELECT : IS NOT NULL
- INSERT/UPDATE/DELETE : IN ('owner', 'coparent')

### Sélection d'icône intelligente

- Edge function `suggest-icon` → `google/gemini-2.5-flash`
- Déclenché au `onBlur` du champ nom si domaine sélectionné
- Retourne un nom d'icône Lucide parmi 33 autorisées
- Picker grid 6 colonnes pour changer manuellement

**Liste autorisée :**
Footprints, Bike, Baby, Heart, Brain, Ear, Eye, Hand, Stethoscope, Activity, Dumbbell, Wind, Music, Smile, Sun, Star, Flower2, Leaf, Waves, Circle, ArrowUp, MoveHorizontal, StretchHorizontal, PersonStanding, Accessibility, Gamepad2, Puzzle, BookOpen, Paintbrush, Scissors, Timer, Zap, Sparkles

### Flow chrono

1. Liste activités → tap → bottom sheet (Chrono / Manuel)
2. **Chrono** : minuteur useRef + setInterval, pause/play, saisie distance avec raccourcis (+0.5/+1/+2/+5)
3. Clic "Terminer" → écran récap éditable (durée + distance éditables + note) → "Enregistrer"
4. Double INSERT : `sessions_activite` + `memos` (type = 'activite')
5. **Saisie manuelle** : formulaire durée MM:SS + distance + date + note → même double INSERT

### Format mémo activité

```json
{
  "type": "activite",
  "processing_status": "done",
  "content_structured": {
    "resume": "Motilo — 06:19 / 3 metres",
    "notes": "Note optionnelle",
    "tags": ["Moteur"]
  }
}
```

### Card timeline type activite

- Fond `rgba(232,239,255,0.45)`, border `rgba(139,116,224,0.2)`
- Dot plein violet `#8B74E0`, box-shadow `0 0 0 3px rgba(139,116,224,0.24)`
- Badge "🏃 Activité" violet
- Titre = nom de l'activité (partie avant " — ")
- Stats côte à côte : durée + distance en Fraunces 16px bold avec labels 10px gris

### Détail mémo activité

- Date + membre + badge domaine en lecture seule
- Stats glass card : durée + distance éditables inline
- Note éditable inline
- Domaine éditable (sélecteur dots)
- Bouton supprimer → DELETE cascade `sessions_activite` + `memos`

### Gestion activités (⋮ à implémenter)

- Bouton ⋮ sur chaque card de la liste → Modifier (nom, icône, domaine) / Archiver (`actif = false`)
- Pas de suppression (préserve l'historique des sessions)

---

## FAB "+" — menu AddMemoSheet.tsx

```
+ → main menu
  ├── NotebookPen  Note de rendez-vous  → sous-menu
  │     ├── Mic      Note vocale        → /record
  │     └── PenLine  Note écrite        → /nouvelle-note
  ├── FileText   Document               → existant
  ├── Pin        Événement              → existant
  └── Activity   Activité               → liste activités enfant → Drawer Chrono/Manuel
```

- Composant autonome : `src/components/AddMemoSheet.tsx`
- Animation slide CSS 300ms entre vues (main / notes / activites)
- Aucun emoji — icônes Lucide uniquement

---

## Sélecteur d'intervenant

### SearchPicker (NouveauMemoVocal + NouvelleNote)

- Input recherche "Nom ou spécialité…" + section "Récents" (3 derniers, triés par `memo_date` DESC)
- Filtre temps réel sur `nom` + `specialite` (insensible casse + accents)
- Compteur "X résultats"
- Terme recherché mis en surbrillance (`#8B74E0`) dans la spécialité
- Chip après sélection : avatar petit + "Nom · Spécialité" + ✕ pour désélectionner
- Bouton "Passer cette étape" en bas

### IntervenantPicker (RecordMemo)

- Filtre obligatoire : `actif = true`

> **Règle critique** : ne jamais afficher les membres `actif = false` dans aucun sélecteur.

---

## Mon Village — règles UX

- Liste filtrée par type (Professionnels / Famille)
- Sous-filtre disciplines dynamique (chips générés depuis les spécialités réelles)
- Tap card → slide-in panel (65% mobile, 40% desktop) avec champs éditables
- Suppression = `actif → false` (jamais DELETE)
- Formulaire ajout différencié : Pro (nom, spécialité, tel, email, structure, notes) / Famille (nom, relation dropdown, tel, email)
- Icônes téléphone/email sur card si renseignés → actions directes (tel:, mailto:)

---

## Feature Onboarding

### Onboarding owner — 5 étapes

`StepEnfant → StepVillage → StepVocabulaire → StepNSM → StepReady`

- Flag `onboarding_completed` posé à la fin de StepNSM (`handleNSM`)
- Vérifié au mount de `/onboarding` → redirige vers `/timeline` si déjà complété
- Handlers non-bloquants : `handleVocabulaire`, `handleVillage`, `handleNSM`
- Fallback écran blanc step 3 : vérifier `enfantId` non null avant d'afficher StepVocabulaire
- StepVocabulaire : variantes prénom invisibles, affichage structures uniquement

### Onboarding invité — 6 étapes

Route `/onboarding-invite?token=UUID`
- Vérification token via `verify-invite-token` en premier
- Création mot de passe → setup profil → découverte features

---

## Feature Synthèse Magique (à builder)

**Route :** `/outils/synthese`
**Edge function :** `generate-synthesis` (à créer)
**Carte Outils :** `Sparkles` — actuellement désactivée + badge "Bientôt"

### 4 cas d'usage

| # | Nom | cas_usage |
|---|---|---|
| 1 | Pick-me-up | `pick_me_up` |
| 2 | Dossier MDPH | `mdph` |
| 3 | Préparer un RDV | `rdv_briefing` / `rdv_presentation` |
| 4 | Transmission | `transmission` |

### Règles absolues tous moteurs

- Jamais de diagnostic, jamais de pronostic
- Jamais de vocabulaire clinique non expliqué
- Jamais d'extrapolation au-delà des données validées
- L'IA cherche des faits saillants — pas des progressions inventées
- L'IA ne s'affiche pas dans les cards timeline

> Référence complète : PRD-synthese-magique-v3.md

---

## Page Outils — grille bento 2×2

| Carte | Icône Lucide | État | Action |
|---|---|---|---|
| Suivi d'activités | `Activity` | ✅ Actif | → `/outils/activites` |
| Synthèse magique | `Sparkles` | 🔜 Désactivé + badge "Bientôt" | — |
| Planning | `CalendarDays` | 🔜 Désactivé + badge "Bientôt" | — |
| Export | `Share2` | 🔜 Désactivé + badge "Bientôt" | — |

---

## Règles métier non négociables

1. L'app ne pose jamais de diagnostic. Aucune interprétation médicale.
2. Timeline inversée : le plus récent en bas. On remonte vers le passé en scrollant vers le haut.
3. Effet de révélation au scroll : opacity uniquement (pas de scale — crée un stacking context qui bloque backdrop-filter).
4. Un mémo = 1 résumé IA max 1 phrase sur la card.
5. Un mémo peut avoir 1 à 3 domaines.
6. Pas de compte professionnel de santé dans le MVP.
7. Aucune friction à l'entrée.
8. RGPD : données Supabase EU. Aucune donnée de santé transmise à des tiers.
9. Ne jamais afficher la transcription vocale brute à l'utilisateur.
10. Ne jamais DELETE un membre du village — toujours `actif = false`.
11. Ne jamais afficher les membres `actif = false` dans les sélecteurs.
12. Boutons principaux jamais en `position: fixed` — toujours dans le flux normal.
13. Le lexique appartient à l'enfant — partagé entre tous les membres du village.
14. Ne jamais afficher les variantes `onboarding_prenom` à l'utilisateur.
15. Le prénom de l'enfant ne doit jamais être modifié, accentué ou altéré par l'IA.
16. Les synthèses ne doivent jamais inventer de progression — uniquement des faits saillants issus des données validées.
17. ← NOUVEAU : Les axes de développement appartiennent à l'enfant — owner et coparent peuvent créer/modifier, famille lecture seule.
18. ← NOUVEAU : Jamais de DELETE sur les axes — archiver uniquement (`actif = false`).
19. ← NOUVEAU : Le texte d'une pépite = `content_structured.resume` du mémo source. L'IA ne reformule jamais.
20. ← NOUVEAU : L'animation des étoiles (constellation) utilise opacity uniquement — jamais de scale (casse backdrop-filter).

---

## Ce qu'on ne touche pas

- La logique d'authentification Supabase (`useAuth.tsx`)
- Le design system défini ci-dessus
- La bottom nav sans validation préalable
- `MemoCard`, `BottomNavBar` depuis une modification d'autre page
- `process-memo` : bloc transcription audio, auth, CORS, audio download/delete, processing_status flow
- `generate-lexique`, `suggest-icon`, `invite-member`, `verify-invite-token`

---

## État au 06/03/2026

**Fonctionnel ✅**
- Timeline : mémos, groupement par mois, dots colorés, avatars, filtre par type
- Design system V6 : fond dégradé, liquid glass, Fraunces + DM Sans
- Mon Village : liste, filtres, sous-filtres disciplines, slide-in panel, add/archive membres
- MemoResult : inline-edit, domaines sélecteur, auto-save, champ `a_retenir`
- Onboarding owner 5 étapes : StepEnfant → StepVillage → StepVocabulaire → StepNSM → StepReady
- Lexique phonétique : table `enfant_lexique`, edge function `generate-lexique`, page `/vocabulaire`, VocabBlock collapse/expand
- `process-memo` v2 : correction contextuelle par lexique, prénom protégé, `a_retenir`, mode `text_quick`
- Feature Activités suivies : création, chrono, saisie manuelle, card timeline, détail éditable
- FAB "+" : sous-menu Note de rendez-vous + entrée Activité
- Sélecteur intervenant : recherche + récents + highlight
- Champ `structure` dans intervenants
- Menu profil : "Mon vocabulaire" entre "Mon village" et "Profil de Selena"
- **Multi-user complet** : rôles owner/coparent/famille, RLS, invitations via Resend ✅
- **Redirect URL Supabase configurée** ✅
- **Flow invitation end-to-end testé et validé** : email → `/onboarding-invite` → mot de passe ✅

**Designé, non implémenté — prêt à builder**
- **Carte de Progression** : maquettes validées, PRD complet, architecture BDD et edge functions spécifiées ← NOUVEAU
  - Tables `axes_developpement` + `pepites` à créer
  - Edge functions `generate-axes` + `backfill-pepites` à créer
  - `process-memo` à enrichir avec le bloc détection pépites
  - Page `/profile` à enrichir avec la vue Carte de Progression
- Synthèse Magique : PRD v3 complet, maquettes interactives finalisées (s0→s9)
  - Table `syntheses` + champ MDPH schémas définis
  - Edge function `generate-synthesis` à créer

**Non implémenté (MVP à venir)**
- Gestion activités (⋮ Modifier / Archiver sur les cards)
- Types Étape et Document (maquettes validées)
- Upload PDF documents
- Freemium (10 mémos/mois gratuits)
- PWA / App Store (Capacitor prévu post-MVP)
