

## Selection d'icone intelligente dans OutilsActiviteCreer

### Contrainte technique importante
Le projet utilise **Lovable AI** (gateway interne) et non l'API Claude directement. Le modele `claude-sonnet-4-20250514` n'est pas disponible. L'implementation utilisera `google/gemini-2.5-flash` via le gateway Lovable AI, avec le meme prompt systeme et le meme comportement attendu.

### Fichiers a creer

**1. `supabase/functions/suggest-icon/index.ts`** -- Edge function

- Recoit `{ nom, domaine }` en POST
- Appelle Lovable AI gateway (`google/gemini-2.5-flash`) avec le prompt systeme fourni
- Retourne `{ icon: "NomIcone" }` 
- Gestion CORS, erreurs 429/402, validation que la reponse est dans la liste autorisee

### Fichiers a modifier

**2. `src/pages/OutilsActiviteCreer.tsx`**

Ajouts au state :
- `icone: string` (defaut `"Activity"`)
- `suggestingIcon: boolean`
- `showIconPicker: boolean`

Comportement onBlur du champ nom :
- Si `nom.trim().length > 0` et domaine selectionne -> appel edge function `suggest-icon`
- Pendant le chargement : spinner discret sous le champ nom
- Au retour : afficher apercu avec l'icone Lucide rendue dynamiquement + bouton "Changer"

Apercu icone (sous le champ nom, dans la meme glass card) :
- Icone Lucide rendue via le pattern `icons[icone]` de lucide-react
- Carre arrondi colore (couleur domaine) + nom de l'icone + bouton "Changer" a droite

Picker grid (affiche quand `showIconPicker = true`) :
- Glass card supplementaire avec grille 6 colonnes
- 33 icones de la liste, chacune en bouton 40x40
- Tap = selection, ferme le picker
- Icone active surlignee avec halo domaine

INSERT Supabase :
- Ajouter `icone` dans l'objet d'insertion

### Liste des icones (constante partagee)

```text
Footprints, Bike, Baby, Heart, Brain, Ear, Eye, Hand, Stethoscope, Activity,
Dumbbell, Wind, Music, Smile, Sun, Star, Flower2, Leaf, Waves, Circle,
ArrowUp, MoveHorizontal, StretchHorizontal, PersonStanding, Accessibility,
Gamepad2, Puzzle, BookOpen, Paintbrush, Scissors, Timer, Zap, Sparkles
```

### Design
- Apercu icone : inline dans la glass card du nom, alignement horizontal
- Picker : glass card separee, grille responsive, icones en couleur du domaine actif
- Bouton "Changer" : texte lavande `#8B74E0`, sans fond

