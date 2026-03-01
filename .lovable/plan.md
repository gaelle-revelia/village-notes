
Objectif
Corriger de façon fiable le flux d’invitation pour que l’utilisateur invité arrive toujours sur le mini-onboarding, même si le lien email atterrit sur /auth.

Constats vérifiés dans le code actuel
1) Flux invitation backend
- `VillageSettings.tsx` envoie bien `redirect_url: window.location.origin + "/onboarding-invite"` dans les 2 cas (invitation + renvoi).
- `invite-member` transmet bien cette valeur à `inviteUserByEmail(..., { redirectTo })` et `signInWithOtp(..., { emailRedirectTo })`.

2) Routage frontend
- `RootRedirect` (dans `App.tsx`) redirige vers `/onboarding-invite` uniquement si `localStorage.invite_pending === 'true'`.
- `OnboardingInvite.tsx` protège déjà l’accès avec ce flag (sinon `/timeline` si connecté, `/auth` sinon).
- `Auth.tsx` redirige un utilisateur connecté vers `/timeline` (et ne priorise pas `invite_pending`), avec un comportement intermédiaire basé sur `user_metadata`.

3) Hook auth
- `useAuth.tsx` ne redirige plus (conforme à la règle), et ne traite l’invitation que sur `SIGNED_IN` :
  - lit `user_metadata.enfant_id` + `role`
  - upsert dans `enfant_membres`
  - écrit `invite_pending` + `invite_*` en localStorage
  - nettoie metadata.

Diagnostic probable (ordre de probabilité)
A. Cause principale très plausible :
- L’invitation est envoyée depuis l’aperçu (preview), donc `window.location.origin` = domaine preview.
- Si les URLs autorisées côté auth ne couvrent pas ce domaine preview, `redirectTo` peut être ignoré/fallback.
- Résultat observé cohérent : l’utilisateur finit sur `/auth` au lieu de `/onboarding-invite`.

B. Cause complémentaire côté app :
- Quand on arrive sur `/auth` après magic link, la logique de cette page ne priorise pas le flux invitation (`invite_pending`) et peut casser la continuité vers onboarding.

Fix le plus sûr (robuste même si le template email ne suit pas toujours redirectTo)
Je propose une correction “défense en profondeur” en 3 couches :

Couche 1 — Continuité du flux depuis /auth (indépendante du template)
Fichier: `src/pages/Auth.tsx`
- Changer la priorité des redirections pour un utilisateur connecté :
  1. Si `invite_pending === 'true'` → `/onboarding-invite`
  2. Sinon → `/timeline`
- Supprimer la branche “spinner redirection” basée uniquement sur `user_metadata` (elle est fragile depuis que `useAuth` ne redirige plus).

Impact:
- Même si le lien email ouvre `/auth`, l’utilisateur connecté repasse automatiquement vers `/onboarding-invite` dès que le flag est présent.

Couche 2 — Gardes de route alignées sur l’état invitation
Fichier: `src/App.tsx` (`RootRedirect`)
- Étendre la condition invitation :
  - `/onboarding-invite` si `invite_pending === 'true'`
  - garder le reste inchangé.
- Option de robustesse supplémentaire (si souhaitée) :
  - considérer aussi `user.user_metadata.enfant_id/role` en fallback transitoire pour éviter les courses de timing entre `SIGNED_IN` et écriture localStorage.

Impact:
- Point d’entrée `/` fiable, source unique de vérité de routage.

Couche 3 — URL de redirection d’invitation stable (contournement preview)
Fichier: `src/pages/VillageSettings.tsx`
- Remplacer l’usage brut de `window.location.origin` par une base URL stable orientée “app publiée” pour les invitations.
- Appliquer la même logique dans les 2 appels (invitation initiale + renvoi).

Impact:
- Même si l’invitation est envoyée depuis preview, le lien email cible la bonne origine publique, compatible avec la config auth.

Pourquoi c’est “le plus sûr”
- Ne dépend pas d’un seul mécanisme (template email, redirectTo, event auth).
- Respecte la règle architecture: `useAuth` ne redirige jamais.
- Rend le flux résilient aux variations d’environnement (preview vs publié) et aux timings auth.

Plan d’implémentation séquencé
1. `Auth.tsx` — prioriser `invite_pending` pour utilisateur connecté.
2. `App.tsx` — confirmer/renforcer la logique de `RootRedirect` invitation.
3. `VillageSettings.tsx` — unifier une URL de redirection stable pour invitations.
4. Vérifier qu’`OnboardingInvite.tsx` reste cohérent avec cette logique (pas de changement fonctionnel si déjà correct).

Tests de validation (E2E indispensables)
Cas 1 — Nouvelle invitation (utilisateur sans compte)
- Envoi invitation → clic email → arrivée onboarding (pas /auth).
- Fin du mini-onboarding → nettoyage localStorage → arrivée `/timeline`.

Cas 2 — Renvoi invitation (utilisateur existant)
- Clic magic link → onboarding direct.
- Pas de boucle `/auth` ↔ `/timeline`.

Cas 3 — Reload pendant onboarding
- `invite_pending` persiste et maintient l’accès à `/onboarding-invite`.

Cas 4 — Accès direct non invité à `/onboarding-invite`
- Non connecté: redirection `/auth`.
- Connecté sans flag: redirection `/timeline`.

Notes techniques importantes
- Je ne touche pas la logique métier non liée (auth de base, schémas, design system).
- Je n’introduis pas de redirection dans `useAuth`.
- Le contournement côté code couvre explicitement l’hypothèse “template email/fallback URL”.

Si tu approuves, j’applique exactement ces ajustements ciblés (seulement les fichiers mentionnés), puis je te fais un retour de vérification parcours complet.
