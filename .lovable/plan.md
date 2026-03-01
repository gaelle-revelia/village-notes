

## Refonte du menu FAB "+" de la Timeline

### Objectif
Extraire le menu du bouton "+" dans un composant dedie `AddMemoSheet.tsx`, avec une nouvelle structure hierarchique : sous-menu inline pour "Note de rendez-vous", entree "Activite" avec liste dynamique et drawer chrono/manuel.

### Architecture

Le menu actuel est inline dans `Timeline.tsx` (Dialog + menuItems). On va :
1. Creer `src/components/AddMemoSheet.tsx` — composant autonome recevant `open`, `onOpenChange`, `enfantId`
2. Simplifier `Timeline.tsx` pour utiliser ce composant

### Structure du menu

```text
+------------------------------------------+
|                                      [X]  |
|  NotebookPen  Note de rendez-vous    >    |  <- tap = expand inline
|  FileText     Document               >    |  <- tap = navigate
|  Pin          Evenement              >    |  <- tap = navigate
|  Activity     Activite              >    |  <- tap = expand inline
+------------------------------------------+

Sous-menu "Note de rendez-vous" (slide inline) :
+------------------------------------------+
|  <  Note de rendez-vous                   |
|  Mic       Note vocale               >    |
|  PenLine   Note ecrite              >    |
+------------------------------------------+

Sous-menu "Activite" (slide inline) :
+------------------------------------------+
|  <  Activite                              |
|  [icon]  Natation    Moteur          >    |
|  [icon]  Marche      Moteur          >    |
|  ...                                      |
+------------------------------------------+
  -> Tap sur une activite -> Drawer Chrono/Manuel (meme que OutilsActivites)
```

### Plan technique

**1. Creer `src/components/AddMemoSheet.tsx`**

- Props : `open: boolean`, `onOpenChange: (v: boolean) => void`, `enfantId: string | null`
- State interne : `view` = `"main"` | `"notes"` | `"activites"` | `null`
- State : `activites: Activite[]`, `selectedActivite: Activite | null`
- `useEffect` : fetch activites quand `view === "activites"` et `enfantId` existe
- Icones Lucide uniquement : `NotebookPen`, `Mic`, `PenLine`, `FileText`, `Pin`, `Activity`, `Timer`, `ChevronRight`, `ChevronLeft`, `X`
- Meme Dialog glass que l'actuel
- Animation slide entre vues : transition CSS `transform` + `opacity` (300ms)
- Quand tap sur une activite : fermer le Dialog, ouvrir le Drawer chrono/manuel (meme pattern exact que `OutilsActivites.tsx` lignes 149-183)
- Style glass identique au reste de l'app, aucun emoji

**2. Modifier `Timeline.tsx`**

- Supprimer `menuItems`, le bloc `<Dialog>` entier, et les imports `Dialog*`, `ChevronRight`, `X`
- Importer `AddMemoSheet` et le rendre avec `open={sheetOpen}`, `onOpenChange={setSheetOpen}`, `enfantId` depuis `useEnfantId()`
- Le FAB reste inchange

### Details d'implementation

- Le sous-menu "Note de rendez-vous" affiche 2 items : Note vocale (`/nouveau-memo-vocal`) et Note ecrite (`/nouvelle-note`)
- Le sous-menu "Activite" fetch `activites` WHERE `enfant_id = enfantId AND actif = true`, affiche chaque activite avec son icone Lucide dynamique et son domaine colore (meme rendu que `OutilsActivites.tsx`)
- Le Drawer chrono/manuel est integre dans `AddMemoSheet.tsx` (pas de navigation vers OutilsActivites) — il reutilise exactement le meme markup : DrawerContent avec 2 boutons (Lancer le chrono → `/outils/activites/{id}/chrono`, Ajouter manuellement → `/outils/activites/{id}/manuel`)
- Transition entre vues : les 3 panneaux (main, notes, activites) sont rendus cote a cote dans un conteneur overflow-hidden, avec `translateX` anime selon la vue active

### Fichiers modifies

| Fichier | Action |
|---|---|
| `src/components/AddMemoSheet.tsx` | Creer (nouveau composant) |
| `src/pages/Timeline.tsx` | Simplifier : retirer Dialog inline, utiliser AddMemoSheet |

