

## Plan: "Préciser ce bloc" — refine_block mode + PreciserBlocDrawer

### Part 1 — Edge function: add `refine_block` mode

In `supabase/functions/generate-synthesis/index.ts`, add a new branch:

- Parse `bloc_id`, `bloc_title`, `bloc_content`, `precision`, `cas_usage`, `synthese_id` from body
- Fetch enfant `prenom` + `sexe` (reuse existing pattern)
- System prompt: regenerate only this block, integrate precision naturally, keep tone/length, no invention, return `{ "content": "..." }`
- User message: bloc_title + bloc_content + precision + prenom + pronouns
- Update `syntheses` row: read `contenu` JSON, find bloc by `bloc_id`, replace content, write back
- Return `{ bloc_id, content }`

### Part 2 — Create PreciserBlocDrawer component

New file: `src/components/synthese/PreciserBlocDrawer.tsx`

**Props:** `isOpen`, `onClose`, `bloc: { id, title, content, cas_usage }`, `enfantId`, `syntheseId`, `onBlockUpdated: (blocId: string, newContent: string) => void`

**UI structure (top to bottom):**

1. **DrawerTitle:** "✏️ Préciser ce bloc"
2. **Current content preview:**
   - Label: "Ce bloc actuellement :" — DM Sans 12px, color `#9A9490`
   - Glass card showing `bloc.content`, `line-clamp-3` by default
   - If content exceeds 3 lines, show a "voir tout" toggle (DM Sans 12px, color `#8B74E0`) that expands/collapses the card
   - State: `expanded` boolean, toggles between `line-clamp-3` and full display
3. **Textarea:** placeholder "Ajoute ta précision ici..."
4. **WiredMicOrb:** voice input appends to textarea
5. **CTA:** "Régénérer ce bloc →" gradient button, disabled if textarea empty, pulses during loading

**On submit:** invoke `generate-synthesis` with `type: "refine_block"`, on success call `onBlockUpdated`, close drawer, toast success.

### Part 3 — Wire buttons in all 3 result pages

**Transmission** (`OutilsSyntheseTransmission.tsx`):
- State: `refineBloc`, `syntheseId`
- ResultCard "Préciser ce bloc" → opens drawer with bloc data
- `onBlockUpdated` → update `generatedBlocks` in place

**MDPH** (`OutilsSyntheseMdph.tsx`):
- Same pattern with ThematicBlock buttons

**Pick-me-up** (`OutilsSynthesePickMeUp.tsx`):
- Single block ("narrative"), add "Préciser ce bloc" button, same drawer

### Files changed

| File | Action |
|---|---|
| `supabase/functions/generate-synthesis/index.ts` | Add `refine_block` branch |
| `src/components/synthese/PreciserBlocDrawer.tsx` | Create |
| `src/pages/OutilsSyntheseTransmission.tsx` | Wire drawer |
| `src/pages/OutilsSyntheseMdph.tsx` | Wire drawer |
| `src/pages/OutilsSynthesePickMeUp.tsx` | Wire drawer |

