

## Redesign MemoResult.tsx as inline-editable memo detail page

### Architecture change

Replace the current dual-mode (view/edit toggle) pattern with a **per-field inline-edit** pattern. Each field is tapped to enter edit mode individually, and auto-saves on blur/change. Remove the global `editing` state, `enterEditMode`, `cancelEdit`, and `handleSave` functions.

### New auto-save helper

Create a single `autoSave(updates)` async function that:
- Calls `supabase.from("memos").update(updates).eq("id", memo.id)`
- On success: refreshes memo state + shows toast "Sauvegarde" (2s, fade)
- On error: shows destructive toast

Each field will use its own local editing state (e.g. `editingResume`, `editingDate`) and call `autoSave` on blur or change.

### Section-by-section changes

**1. Header**
- Remove edit mode header (Annuler/Enregistrer)
- Left: back arrow only (no "Retour" text)
- Right: trash icon only, color `#E8736A`, no Pencil button
- Remove title "Memo enregistre" / "Modifier le memo"

**2. Main padding**
- Add `paddingTop: 80px` to `<main>` to avoid sticky header collision

**3. Date (inline-edit)**
- Display: DM Sans 14px, `#9A9490`, centered
- Tap: reveals native `<input type="date">`, pre-filled
- On change: auto-save `memo_date`, update display

**4. Intervenant (inline-edit)**
- Display: 32px avatar (gradient + Lucide icon) + prenom + specialite, centered
- If none: "Associer un membre..." in muted italic
- Tap: show search input filtering intervenants by nom (actif=true)
- Results as dropdown, tap to select, auto-saves `intervenant_id`

**5. Domaines selector (new section)**
- Label "DOMAINES" (10px uppercase, `#9A9490`)
- 5 domain dots in a row, 22px, centered, gap 16px
- Inactive: transparent fill, 2px solid border domain color, opacity 0.35
- Active: filled domain color, glow shadow
- Short labels below (9px): Moteur, Cognitif, Sensoriel, Bien-etre, Medical
- Tap toggles, auto-saves to `content_structured.tags`
- Info button below: "Comment choisir un domaine?"
- Info modal: glass popup with 5 domain descriptions, close on tap outside or X

**6. Resume (inline-edit)**
- Label "RESUME" (10px uppercase, `#9A9490`)
- Display: DM Sans 15px, `#1E1A1A`
- Tap: textarea appears, pre-filled
- Blur: auto-save to `content_structured.resume`

**7. Details (inline-edit)**
- Label "DETAILS" (10px uppercase, `#9A9490`)
- Display: bullet list
- Tap: textarea (one per line), blur auto-saves to `content_structured.details`

**8. A retenir (inline-edit)**
- Label "A RETENIR" (10px uppercase, `#9A9490`)
- Display: bullet list
- Tap: textarea (one per line), blur auto-saves to `content_structured.suggestions`

**9. Tags (always visible)**
- Chips with domain-color dot + label + X remove button
- Remove triggers auto-save
- "Ajouter un tag..." input always visible, Enter adds + auto-saves

**10. Removed sections**
- Transcription textarea (vocal/note/evenement) — removed entirely
- Collapsible "Note originale" — removed entirely
- "Retour a la timeline" button — removed
- "Supprimer ce memo" text link — removed (trash in header)
- Dual-mode editing state and all related state variables

**11. Delete modal**
- Use AlertDialog component
- Overlay: `rgba(0,0,0,0.25)`
- Confirm deletes from database, navigates to `/timeline`

**12. Glass card style update**
- Padding: `16px 20px` (currently 20px all around)

### Files changed

| File | Change |
|------|--------|
| `src/pages/MemoResult.tsx` | Full rewrite of component logic and JSX |

No other files touched.

### State management

Remove: `editing`, `editDate`, `editIntervenantId`, `editTranscription`, `editResume`, `editDetails`, `editSuggestions`, `saving`, `originalNoteOpen`, `cancelEdit`, `enterEditMode`, `handleSave`

Add per-field states:
- `editingField: string | null` — tracks which field is being edited (date, intervenant, resume, details, suggestions)
- `intervenantSearch: string` — search query for intervenant picker
- `showDomaineInfo: boolean` — domaines info modal
- `deleteModalOpen` — kept as-is
- `newTag` — kept as-is

### Domain mapping for the selector

The 5 domains map to tag keywords:
- Moteur: tags containing "moteur", "motricite", "kine", "physique"
- Cognitif: tags containing "cognitif", "psychomoteur", "psychomotricite"
- Sensoriel: tags containing "sensoriel", "communication", "langage"
- Bien-etre: tags containing "bien-etre", "emotionnel", "sommeil", "alimentation"
- Medical: tags containing "medical", "administratif"

When toggling a domain on, add its primary tag (e.g. "moteur"). When toggling off, remove all tags matching that domain.

