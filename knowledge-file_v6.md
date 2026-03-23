# Knowledge File Lovable — The Village

_v7 — 23/03/2026_

## Vision

App mobile React/TypeScript (Lovable + Supabase). The Village organise la mémoire du parcours médico-thérapeutique d'un enfant à besoins spécifiques. Le produit, c'est la mémoire organisée — pas un outil clinique.

## Stack

- Frontend : React + TypeScript via Lovable
- Backend : Supabase (DB + Auth + Edge Functions + RLS)
- Email : Resend (domaine the-village.app) ✅
- URL app : https://thevillage-app.lovable.app
- Modèle : `google/gemini-3-flash-preview` via Lovable AI gateway — identique pour toutes les edge functions, sans exception

## Rôles utilisateurs

- **owner** : parent principal, accès complet. Un seul par enfant. Jamais via invitation.
- **coparent** : accès complet. Via invitation.
- **famille** : lecture seule. Via invitation.
  Pas de rôle professionnel dans le MVP.

## Règle critique — jamais "IA" dans l'UI

Toute mention de l'IA est interdite dans les labels, placeholders, descriptions, onboarding.

- ❌ "L'IA remplit le titre" → ✅ "The Village structure automatiquement"
- ❌ "Résumé IA" → ✅ "Résumé"
- ❌ "L'IA génère" → ✅ "The Village génère automatiquement"
  Exception : `PolitiqueConfidentialite.tsx` — ne jamais modifier.

## Vocabulaire

| Utiliser                | Bannir                         |
| ----------------------- | ------------------------------ |
| Membre du village       | Intervenant                    |
| Mon Village             | Mes intervenants               |
| Professionnel / Famille | Pro / Soignant                 |
| Mémo                    | —                              |
| Étape                   | Évènement, Milestone           |
| Synthèse                | Résumé IA, Rapport             |
| Axe de développement    | Objectif, Goal                 |
| Pépite                  | Progrès, Score                 |
| Liste vivante           | Questions, To-do               |
| En cours                | Ouvert, Actif (badge compteur) |

## Routes

- `/timeline` — page principale, timeline inversée (plus récent en bas)
- `/memo/:id` — détail mémo
- `/nouveau-memo-vocal` — vocal / texte rapide
- `/nouvelle-note` — saisie texte complète
- `/nouvelle-question` — formulaire boucle (rdv/rappel/question) — accepte `?type=` et `?pro_id=`
- `/a-venir` — Liste vivante (OutilsQuestions)
- `/a-venir/:id` — détail boucle (AVenirDetail)
- `/village` — Mon Village liste (VillageSettings)
- `/village/:id` — Fiche pro consultation (VillageProFiche)
- `/village/:id/edit` — Édition fiche pro (VillageProEdit)
- `/selena` — Carte de Progression
- `/outils` — hub outils
- `/outils/activites` — activités
- `/outils/synthese` — Synthèse Magique
- `/outils/coherence` — cohérence cardiaque
- `/onboarding` — owner 5 étapes
- `/onboarding-invite` — invité 6 étapes
- `/profil` `/enfant` `/vocabulaire` `/parametres`
- `/record` — DEPRECATED → redirige vers `/nouveau-memo-vocal`

**Bottom nav (4 onglets) :** Accueil · Selena · À venir · Outils
**Menu drawer (bulle G depuis /selena) :** Mon profil · Mon village · Mon vocabulaire · Profil enfant · Paramètres · Déconnexion
**Retour depuis /village :** toujours `navigate("/selena")` — jamais `navigate(-1)`

## Design system

**Fond global (toutes les pages)**

```css
background: linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%);
```

Tous les parents de composants transparents — ne pas ajouter de fond.

**Typo**

- Titres : Fraunces (serif, 600/700)
- Corps : DM Sans (300/400/500/600)
- Texte : #1E1A1A — Muted : #9A9490

**Couleurs domaines**

- Corail `#E8736A` · Lavande `#8B74E0` · Menthe `#44A882`
- Abricot `#E8A44A` · Gris `#8A9BAE` · Or `#E8C84A`

**Liquid glass standard (Tailwind)**

```
bg-[rgba(255,255,255,0.52)] backdrop-blur-[16px] backdrop-saturate-[1.6] border border-[rgba(255,255,255,0.72)] rounded-2xl shadow-[0_4px_16px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)]
```

**Bouton principal**

```
background: linear-gradient(135deg, #E8736A, #8B74E0); color: white; border-radius: 14px;
```

**Badge pill lavande (boucles en cours)**

```
bg: rgba(139,116,224,0.12) · text: #534AB7 · 10px 600 · padding: 2px 7px · radius: 10px
```

**Avatars intervenants — dégradés**

- Kiné/moteur : `#E8736A → #E8845A`
- Psychomot : `#8B74E0 → #5CA8D8`
- Ergo/ortho : `#44A882 → #4E96C8`
- Famille/parent : `#E8736A → #C85A8A`
- Médecin/Dr/MPR : `#8A9BAE → #6B7F94`
- Default : `#8A9BAE → #6B7F94`

## Composants clés

- `VillageSettings.tsx` — Mon Village liste. Cards pro → `/village/:id`. Cards famille → MemberDetailPanel.
- `VillageProFiche.tsx` — Fiche pro /village/:id. Hero + contact row 3 boutons + sections RDV/Questions.
- `VillageProEdit.tsx` — Édition /village/:id/edit. Champs + Enregistrer + Retirer du village.
- `MemberDetailPanel.tsx` — Slide-in famille uniquement. Ne pas modifier.
- `NouvelleQuestion.tsx` — Formulaire boucle. Gère `?type=` et `?pro_id=`. Banner entièrement cliquable.
- `OutilsQuestions.tsx` — Liste vivante /a-venir.
- `AVenirDetail.tsx` — Détail boucle /a-venir/:id.
- `MemoCard.tsx` — Card timeline. Ne pas toucher depuis une autre page.
- `BottomNavBar.tsx` — Nav 4 onglets. Ne pas toucher sans validation.
- `AddMemoSheet.tsx` — FAB "+". Ne pas toucher sans validation.

## Mon Village — règles

- Cards pro : tap → `/village/:id` (jamais slide-in)
- Cards famille : tap → MemberDetailPanel (jamais page dédiée)
- Badge "X en cours" : COUNT questions WHERE `linked_pro_ids @> [pro.id]` AND `archived_at IS NULL`
- Suppression membre : `actif = false` — jamais DELETE
- Ne jamais afficher membres `actif = false` dans les sélecteurs

## Fiche pro /village/:id — règles

- Contact row : 3 boutons TOUJOURS présents (Appeler · Email · Éditer)
- Si tel/email absent : bouton grisé, texte "Ajouter", navigue vers /village/:id/edit
- Sections RDV + Questions : 3 items par défaut, "Voir X de plus" si total > 3, "Replier"
- Tap item → `/a-venir/:id`
- "+ Nouveau" → `/nouvelle-question?type=rdv&pro_id=[id]`
- "+ Nouvelle" → `/nouvelle-question?type=question&pro_id=[id]`

## Liste vivante — règles

- 3 types : rdv / rappel / question
- Archivage : `archived_at = now()` — jamais DELETE
- Sections masquées si vides
- Date approximative active par défaut pour les Rappels
- Clôture toujours explicite

## Règles métier non négociables

1. Jamais de diagnostic. Aucune interprétation médicale.
2. Timeline inversée : plus récent en bas.
3. Scroll reveal : opacity uniquement — pas de scale (casse backdrop-filter).
4. 1 mémo = 1 résumé max 1 phrase sur la card.
5. 1 mémo peut avoir 1 à 3 domaines.
6. Pas de compte professionnel dans le MVP.
7. Aucune friction à l'entrée.
8. Jamais afficher la transcription vocale brute.
9. Jamais DELETE un membre — `actif = false`.
10. Jamais afficher membres `actif = false` dans les sélecteurs.
11. Boutons principaux jamais en `position: fixed`.
12. Le lexique appartient à l'enfant — partagé entre tous les membres.
13. Le prénom de l'enfant ne doit jamais être altéré.
14. Jamais DELETE les axes de développement — `actif = false`.
15. Jamais mentionner "IA" dans l'UI (sauf PolitiqueConfidentialite.tsx).

## Ce qu'on ne touche pas

- `useAuth.tsx` — logique auth Supabase
- `MemoCard.tsx`, `BottomNavBar.tsx` — depuis une autre page
- `AddMemoSheet.tsx` — sans validation préalable
- `MemberDetailPanel.tsx` — sauf bug avéré
- `PolitiqueConfidentialite.tsx` — document légal
- `process-memo` — bloc transcription, auth, CORS, processing_status
- `generate-lexique`, `suggest-icon`, `invite-member`, `verify-invite-token`

## État au 23/03/2026

**Fonctionnel ✅**

- Timeline : mémos, groupement mois, dots, avatars, filtre type
- Mon Village : liste, filtres, badge "X en cours", fiche pro /village/:id, édition /village/:id/edit
- Liste vivante : /a-venir, /a-venir/:id, /nouvelle-question avec ?type= et ?pro_id=
- MemoResult : inline-edit, domaines, auto-save
- Onboarding owner + invité ✅
- Lexique phonétique ✅
- Activités suivies : création, chrono, saisie manuelle ✅
- Multi-user : rôles, RLS, invitations Resend ✅
- Carte de Progression : axes, pépites, constellation ✅
- Synthèse Magique : 4 moteurs ✅
