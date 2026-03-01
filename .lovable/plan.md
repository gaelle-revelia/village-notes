
## Activites suivies -- Implementation

### Verification prealable
- `PlaceholderScreen` : existe dans `src/components/PlaceholderScreen.tsx`
- `vaul` (Drawer) : existe dans `src/components/ui/drawer.tsx`
- `useEnfantId` : existe et retourne `enfantId`, `role`, `loading`
- Tables `activites` et `sessions_activite` : deja creees avec RLS

### Fichiers a modifier

**1. `src/pages/OutilsScreen.tsx`** -- Grille bento 2x2

Remplacer le placeholder par 4 cartes liquid glass en grille :
- "Suivi d'activites" (Activity) : actif, navigue vers `/outils/activites`
- "Synthese magique" (Sparkles) : desactive, badge "Bientot"
- "Planning" (CalendarDays) : desactive, badge "Bientot"
- "Export" (Share2) : desactive, badge "Bientot"

Conservation du header glass + BottomNavBar + ProfileAvatar.

**2. `src/App.tsx`** -- 4 nouvelles routes

```text
/outils/activites           -> OutilsActivites
/outils/activites/creer     -> OutilsActiviteCreer
/outils/activites/:id/chrono -> PlaceholderScreen("Chrono")
/outils/activites/:id/manuel -> PlaceholderScreen("Saisie manuelle")
```

### Fichiers a creer

**3. `src/pages/OutilsActivites.tsx`** -- Liste des activites

- Header glass avec retour vers `/outils`
- Fetch activites depuis Supabase (filtrees par enfant_id, actif=true)
- Carte glass par activite : icone domaine coloree, nom, badges domaine + unites
- Tap carte -> Drawer (bottom sheet) avec 2 options : Chrono (Timer) / Manuel (PenLine)
- Bouton dashed "Nouvelle activite" (Plus) -> `/outils/activites/creer`
- Etat vide avec message encourageant

**4. `src/pages/OutilsActiviteCreer.tsx`** -- Formulaire creation

- Header glass avec retour vers `/outils/activites`
- Champ texte Nom
- Selecteur domaine : 5 dots colores (Moteur/Cognitif/Sensoriel/Bien-etre/Medical)
- Toggle group : Temps / Distance / Les deux
- Si distance active : toggle Metres / Km
- Bouton gradient "Creer l'activite" -> insert Supabase + retour liste

### Design system applique
- Fond transparent (gradient global visible)
- Fraunces titres, DM Sans corps
- Couleurs : Corail #E8736A, Lavande #8B74E0, Menthe #44A882, Abricot #E8A44A, Gris #8A9BAE
- Liquid glass cards (rgba(255,255,255,0.38), blur 16px, border rgba(255,255,255,0.85))
- Bouton principal : gradient corail-lavande
