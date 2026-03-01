

## Ecrans de session activite et integration timeline

### Vue d'ensemble

Trois fichiers a creer, deux fichiers a modifier. L'objectif est de remplacer les ecrans placeholder par de vrais ecrans chrono et saisie manuelle, puis d'ajouter le type `activite` dans la timeline.

---

### 1. Creer `src/pages/OutilsActiviteChrono.tsx`

Ecran chrono temps reel pour une seance d'activite.

**Comportement :**
- Fetch activite par `:id` depuis la table `activites` (colonnes: id, nom, domaine, track_temps, track_distance, unite_distance, icone)
- Header glass avec ArrowLeft + nom + badge domaine colore
- Chrono central : `useRef` pour `intervalRef`, `setInterval` chaque seconde, `clearInterval` dans le cleanup du `useEffect`. State `seconds` incremente. Affichage MM:SS en Fraunces 42px dans un cercle glass
- Boutons Pause/Play (toggle `running`) + "Terminer la seance" (gradient corail-lavande)
- Si `track_distance === true` : section saisie numerique + raccourcis (+0.5, +1, +2, +5) avec unite dynamique
- Au clic "Terminer" : `showRecap = true` — affichage inline de la duree, distance, textarea note, bouton "Enregistrer la seance"
- Enregistrement : 2 inserts paralleles avec `Promise.all` :
  - `sessions_activite` : activite_id, enfant_id, duree_secondes, distance, notes, created_at
  - `memos` : type `'activite'`, user_id, enfant_id, memo_date, processing_status `'done'`, transcription_raw avec le format `"{nom} — {MM:SS}{distance ? ' / ' + distance + unite : ''}"`, content_structured avec resume identique et tags contenant le domaine
- Apres succes : `navigate('/outils/activites')`

### 2. Creer `src/pages/OutilsActiviteManuel.tsx`

Formulaire de saisie manuelle post-seance.

**Comportement :**
- Fetch activite par `:id`
- Header glass avec retour
- Formulaire centre (max-width 480px), sections glass card :
  - Duree MM:SS (si track_temps) : input texte avec placeholder "00:00", parse en secondes
  - Distance numerique (si track_distance) : input number + unite
  - Date : composant MemoDatePicker, defaut aujourd'hui
  - Note optionnelle : textarea
- Bouton "Enregistrer la seance" dans le flux (pas fixed/sticky)
- Meme double INSERT que le chrono, avec `created_at` = date choisie

### 3. Modifier `src/App.tsx`

Remplacer les 2 routes PlaceholderScreen par les vrais composants :
- Import `OutilsActiviteChrono` et `OutilsActiviteManuel`
- Route `:id/chrono` → `OutilsActiviteChrono`
- Route `:id/manuel` → `OutilsActiviteManuel`

### 4. Modifier `src/components/memo/MemoCard.tsx`

Ajouter le cas `type === 'activite'` :

- Nouveau badge dans `TYPE_BADGES` : `activite: { emoji: "🏃", label: "Activite", color: "#8B74E0" }`
- Nouveau cas dans `getCardStyle` pour `activite` : `background: rgba(232,239,255,0.45)`, `border: 1px solid rgba(139,116,224,0.2)`
- Logique de rendu specifique dans le composant :
  - Le `transcription_raw` contient `"{nom} — {duree} / {distance}"` 
  - Titre = partie avant " — "
  - Stats = partie apres " — ", separees par " / ", affichees cote a cote avec separateur vertical

### 5. Modifier `src/pages/Timeline.tsx`

Ajouter le cas `type === 'activite'` dans le calcul du dot style :
- Dot plein violet `#8B74E0`, taille 11px, `boxShadow: 0 0 0 3px rgba(139,116,224,0.24)`

Le type `activite` sera inclus dans le filtre `displayable` car il aura un `transcription_raw` rempli.

---

### Schema de donnees du memo activite

```text
memos INSERT:
  type: 'activite'
  user_id: auth user id
  enfant_id: enfant_id
  memo_date: date de la seance
  processing_status: 'done'
  transcription_raw: "Marche — 05:30 / 2.5 km"
  content_structured: { resume: "Marche — 05:30 / 2.5 km", tags: ["Moteur"] }
```

### Design

- Chrono : cercle glass 200x200px, temps Fraunces 42px, boutons ronds 56px
- Raccourcis distance : chips arrondis avec couleur domaine
- Recap : glass card avec resume + textarea + CTA
- Card timeline activite : fond bleu pale, badge violet, parsing du texte pour titre/stats
