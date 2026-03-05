# Knowledge File — The Village
*v5-compact — 05/03/2026*

## Vision produit
Transforme les notes et observations du parent en vision structurée du parcours médico-thérapeutique d'un enfant à besoins spécifiques. L'IA est un facilitateur invisible. Le produit, c'est la mémoire organisée du chemin parcouru.

## Stack technique
- **Frontend** : React + TypeScript via Lovable
- **Backend** : Supabase (DB + Auth + Edge Functions + RLS)
- **Email** : Resend — domaine the-village.app ✅
- **Modèle IA** : `google/gemini-3-flash-preview` via Lovable AI gateway
- **Bucket audio** : `audio-temp` (unifié — ne pas utiliser `voice-memos`)

## Rôles utilisateurs
- **owner** : accès complet
- **coparent** : accès complet (lecture + écriture)
- **famille** : lecture seule
- Pas de rôle professionnel de santé dans le MVP.

## Pages et navigation
- `/` → `/timeline` si connecté, sinon `/login`
- `/timeline` → page principale, timeline inversée (plus récent en bas)
- `/memo/:id` → détail mémo
- `/nouvelle-note` → saisie texte complète (mode `text`)
- `/record` → enregistrement vocal + saisie rapide (mode `text_quick`) — **NE PAS créer de route `/nouveau-memo-vocal`**
- `/village` → gestion membres
- `/profile` → profil utilisateur + enfant
- `/vocabulaire` → lexique phonétique
- `/outils` → hub outils (grille 2×2)
- `/outils/activites` → liste activités
- `/outils/activites/creer` → création activité
- `/outils/activites/:id/chrono` → chrono
- `/outils/activites/:id/manuel` → saisie manuelle
- `/outils/synthese` → Synthèse Magique *(à builder)*
- `/onboarding` → 5 étapes owner
- `/onboarding-invite` → 6 étapes invité (token UUID requis)

Bottom nav 4 onglets : Accueil · Selena · Outils · Explorer

## Design system

**Fond global**
```css
background: linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%);
```
Tous les parents de composants doivent être transparents pour que backdrop-filter fonctionne.

**Typographie** : Fraunces (titres, 600) · DM Sans (corps, 300/400/500/600)
**Texte** : `#1E1A1A` · Muted : `#9A9490`

**Couleurs domaines**
| Nom | Hex | Usage |
|---|---|---|
| Corail | `#E8736A` | Moteur & physique |
| Lavande | `#8B74E0` | Cognitif & psychomoteur |
| Menthe | `#44A882` | Sensoriel & communication |
| Abricot | `#E8A44A` | Bien-être & émotionnel |
| Gris | `#8A9BAE` | Médical & administratif |
| Or | `#E8C84A` | Étapes uniquement |

**Liquid glass — recette standard**
```css
background: rgba(255,255,255,0.38);
backdrop-filter: blur(16px) saturate(1.6);
border: 1px solid rgba(255,255,255,0.85);
border-radius: 16px;
box-shadow: 0 4px 24px rgba(139,116,224,0.08), inset 0 1px 0 rgba(255,255,255,0.9);
```
Variantes : Étape `rgba(255,248,220,0.55)` border or · Document `rgba(240,243,247,0.55)` border gris · Activité `rgba(232,239,255,0.45)` border violet

**FAB / boutons principaux** : `linear-gradient(135deg, #E8736A, #8B74E0)`

**Avatars intervenants**
| Keywords | Dégradé | Icône |
|---|---|---|
| Kiné | `#E8736A → #E8845A` | Activity |
| Psychomot | `#8B74E0 → #5CA8D8` | Brain |
| Ergo | `#44A882 → #4E96C8` | Hand |
| Parent, famille | `#E8736A → #C85A8A` | Heart |
| Médecin, MPR | `#8A9BAE → #6B7F94` | Stethoscope |
| Orthophonie | `#44A882 → #8B74E0` | MessageCircle |
| Default | `#8A9BAE → #6B7F94` | User |

## Composants clés

**TimelineCard — meta-row**
```
[badge type] | [separator] | [dots domaine] | [separator] | [avatar + prénom] | [date]
Ligne 2 : résumé 14px, 1 phrase max
```

**Dots timeline**
- Mémo/Note : 11px creux, border couleur domaine
- Étape : 16px plein or
- Document : 13px creux border gris
- Activité : 11px plein violet, box-shadow 0 0 0 3px rgba(139,116,224,0.24)
- **Synthèse : ✦ 11px lavande + radiance** `filter: drop-shadow(0 0 4px rgba(139,116,224,0.7))`

**Types de contenu timeline**
| Type | Badge | Card |
|---|---|---|
| Mémo vocal | 🎙 Vocal (lavande) | liquid glass standard |
| Note | ✏️ Note (menthe) | liquid glass standard |
| Étape | ⭐ Étape (or) | liquid glass dorée |
| Document | 📄 Document (gris) | liquid glass grise |
| Activité | 🏃 Activité (violet) | rgba(232,239,255,0.45) |
| **Synthèse** | **✏ SYNTHÈSE (lavande)** | liquid glass standard |

**Card Synthèse meta-row :** `[dots] | [SYNTHÈSE badge] | [avatar parent] | [date]`
Titres : "Remontant · Fév 2026" · "Dossier MDPH · Renouvellement" · "Briefing RDV · Dr. Fontaine" · "Transmission · Crèche Les Petits Pas"

**Filtre timeline** : pills Tous · Rendez-vous · Activités · Documents · Événements · **Synthèses** (filtre `synthese`)

## Schéma BDD — tables principales

**`memos` — content_structured**
```json
{ "resume": "...", "details": [...], "a_retenir": [...], "tags": [...], "intervenant_detected": "..." }
```
- `suggestions` déprécié → remplacé par `a_retenir` (fallback rétrocompatible en lecture)
- `text_quick` : `{ "resume": "...", "details": ["texte brut"], "mode": "text_quick" }`
- `activite` : `{ "resume": "Motilo — 06:19 / 3m", "notes": "...", "tags": [...] }`
- Tags normalisés avec majuscule : `"Moteur"` · `"Cognitif"` · `"Sensoriel"` · `"Bien-être"` · `"Médical"`

**`intervenants`** : id · enfant_id · nom · specialite · type ('pro'|'famille') · actif · telephone · email · structure · notes · photo_url
→ Jamais DELETE — `actif = false` uniquement

**`enfant_lexique`** : id · enfant_id · mot_transcrit · mot_correct · source ('onboarding_prenom'|'onboarding_structure'|'manual')
→ `onboarding_prenom` jamais affiché dans l'UI · Partagé entre tous les membres

**`profiles`** : id · user_id · onboarding_completed (bool) · created_at
→ RLS `user_id = auth.uid()` · Flag posé à la fin de handleNSM

**`enfant_membres`** (junction) + fonction `get_membre_role(enfant_id)`

**`activites`** : id · enfant_id · nom · domaine · icone · track_temps · track_distance · unite_distance · actif
**`sessions_activite`** : id · activite_id · enfant_id · duree_secondes · distance · notes · created_at
→ RLS : SELECT si rôle IS NOT NULL · INSERT/UPDATE/DELETE si rôle IN ('owner','coparent')

**`syntheses`** ✅ CRÉÉE
```sql
id uuid PK · enfant_id · user_id · cas_usage text · periode_debut date · periode_fin date
contenu text · etat_emotionnel text · vocal_mdph text · reponses_transmission jsonb · metadata jsonb · created_at
```
`cas_usage` : `'pick_me_up'|'mdph'|'rdv_briefing'|'rdv_presentation'|'transmission'`
`periode_debut/fin` : null pour MDPH et Transmission

**Champs MDPH sur `enfants`** ✅ AJOUTÉS : `mdph_type_demande text` · `mdph_derniere_demande date`

## Edge functions
| Fonction | Rôle |
|---|---|
| `process-memo` | Transcription + structuration IA |
| `generate-lexique` | Variantes phonétiques |
| `suggest-icon` | Icône Lucide pour activité |
| `invite-member` | Email invitation via Resend |
| `verify-invite-token` | Validation token |
| `generate-synthesis` | Synthèse Magique — 4 moteurs *(à créer)* |

→ `verify_jwt = false` sur toutes — auth via Bearer token manuel
→ Bucket audio : `audio-temp` (suppression immédiate post-transcription)

**`process-memo` — modes**
- `voice` : transcription Gemini audio → structuration complète
- `text` : texte brut → structuration complète
- `text_quick` : résumé uniquement, modèle `gemini-2.5-flash-lite`

**Correction lexique** : analyse sémantique pleine phrase — si mot utilisé comme verbe/nom commun français → NE PAS corriger. En cas de doute → NE PAS corriger.

## Feature Synthèse Magique ← À BUILDER

**Route** : `/outils/synthese` · **Edge function** : `generate-synthesis`
**Carte Outils** : `Sparkles` — actuellement désactivée + badge "Bientôt" → activer à l'implémentation

**4 cas d'usage**
| # | Nom | cas_usage |
|---|---|---|
| 1 | Pick-me-up | `pick_me_up` |
| 2 | Dossier MDPH | `mdph` |
| 3 | Préparer un RDV | `rdv_briefing` / `rdv_presentation` |
| 4 | Transmission | `transmission` |

**Parcours — 10 écrans (s0→s9)**
- s0 : sélection cas d'usage (4 cartes)
- s1 : état émotionnel Pick-me-up (chips + vocal)
- s2 : sélection période Pick-me-up + RDV
- s3 : document Pick-me-up
- s4 : saisie contextuelle MDPH (chips + vocal ouvert — PAS de questions séquentielles)
- s5 : dossier MDPH 4 blocs thématiques + "Préciser ce bloc"
- s6 : période + contexte RDV
- s7 : document RDV
- s8 : questions Transmission 6 sections séquentielles + barre progression
- s9 : document Transmission 6 blocs + barre email

**MDPH — spécificités** : analyse TOUS les mémos (sans filtre période) · 4 blocs : Autonomie · Soins · Scolarité · Vie familiale · Score qualitatif par bloc

**Transmission — 6 sections** : Qui est [prénom] ? · Son histoire et son handicap · Fatigue · Positionnement · Interaction avec les autres · Ses thérapies

**Règles absolues tous moteurs** :
- Jamais de diagnostic, pronostic, vocabulaire clinique non expliqué
- Jamais d'extrapolation au-delà des données disponibles
- Faits saillants uniquement — ne pas inventer de progression
- L'IA ne s'affiche pas dans les cards timeline

> Référence complète : PRD-synthese-magique-v4.md

## FAB "+" — AddMemoSheet.tsx
```
+ → NotebookPen Note de rendez-vous → Mic /record · PenLine /nouvelle-note
  → FileText Document · Pin Événement · Activity Activité → chrono/manuel
```
Icônes Lucide uniquement — aucun emoji.

## Feature Activités suivies
Flow : liste → tap → bottom sheet (Chrono/Manuel) → récap éditable → double INSERT `sessions_activite` + `memos`
Icône intelligente : `suggest-icon` déclenché au onBlur du nom si domaine sélectionné (33 icônes autorisées)
Détail mémo activité : stats durée + distance Fraunces 16px bold · domaine éditable · bouton supprimer → DELETE cascade

## Feature Multi-user & invitations ✅ OPÉRATIONNEL
- `invite-member` → token UUID → email Resend ✅
- `verify-invite-token` → valide le token
- Redirect URL Supabase configurée ✅
- Flow end-to-end testé : email → `/onboarding-invite` → mot de passe ✅

## Feature Lexique phonétique
- Page `/vocabulaire` : sections "Lieux & structures" + "Mots ajoutés"
- `generate-lexique` : mode onboarding (prenom + intervenants) ou manuel
- Composants : `VoiceBanner.tsx` · `VocabBlock.tsx` (collapse/expand, edit inline)

## Feature Onboarding
**Owner** : StepEnfant → StepVillage → StepVocabulaire → StepNSM → StepReady
- `onboarding_completed` posé à la fin de handleNSM
- Handlers non-bloquants : handleVocabulaire, handleVillage, handleNSM
- StepVocabulaire : variantes prenom invisibles, structures seulement

**Invité** : route `/onboarding-invite?token=UUID` → verify-invite-token d'abord → création mot de passe

## Page Outils — grille 2×2
| Carte | Icône | État |
|---|---|---|
| Suivi d'activités | Activity | ✅ Actif → /outils/activites |
| Synthèse Magique | Sparkles | 🔜 Désactivé + badge "Bientôt" |
| Planning | CalendarDays | 🔜 Désactivé |
| Export | Share2 | 🔜 Désactivé |

## Règles métier non négociables
1. Jamais de diagnostic. Aucune interprétation médicale.
2. Timeline inversée : plus récent en bas, on remonte en scrollant vers le haut.
3. Révélation au scroll : opacity uniquement — pas de scale (casse backdrop-filter).
4. Un mémo = 1 résumé IA max 1 phrase sur la card.
5. Un mémo peut avoir 1 à 3 domaines.
6. RGPD : données Supabase EU. Aucune donnée de santé transmise à des tiers.
7. Ne jamais afficher la transcription vocale brute.
8. Ne jamais DELETE un membre — toujours `actif = false`.
9. Ne jamais afficher les membres `actif = false` dans les sélecteurs.
10. Boutons principaux jamais en `position: fixed` — dans le flux normal.
11. Le lexique appartient à l'enfant — partagé entre tous les membres.
12. Ne jamais afficher les variantes `onboarding_prenom` à l'utilisateur.
13. Le prénom de l'enfant ne doit jamais être modifié ou altéré par l'IA.
14. Les synthèses ne doivent jamais inventer de progression — faits saillants uniquement.

## Ce qu'on ne touche pas
- `useAuth.tsx` — logique d'authentification Supabase
- Design system ci-dessus
- Bottom nav sans validation préalable
- `MemoCard`, `BottomNavBar` depuis une modification d'autre page
- `process-memo` : bloc transcription, auth, CORS, audio download/delete, processing_status flow
- `generate-lexique`, `suggest-icon`, `invite-member`, `verify-invite-token`

## État au 05/03/2026

**Fonctionnel ✅**
- Timeline : mémos, groupement par mois, dots colorés, avatars, filtres
- Design system V6 : fond dégradé, liquid glass, Fraunces + DM Sans
- Mon Village : liste, filtres, slide-in panel, add/archive
- MemoResult : inline-edit, domaines, auto-save, `a_retenir`
- Onboarding owner 5 étapes + invité 6 étapes ✅
- Lexique phonétique : table, edge function, page `/vocabulaire`
- `process-memo` v2 : correction contextuelle, prénom protégé, `a_retenir`, `text_quick`
- Activités suivies : création, chrono, saisie manuelle, card timeline, détail éditable
- FAB "+" : sous-menu notes + activité
- Sélecteur intervenant : recherche + récents + highlight
- Multi-user : rôles, RLS, invitations Resend ✅

**À builder**
- Synthèse Magique : PRD v4 complet, maquette s0→s9 finalisée
- Gestion activités (⋮ Modifier / Archiver)
- Types Étape et Document
- Upload PDF
- Freemium
- PWA / App Store (Capacitor post-MVP)