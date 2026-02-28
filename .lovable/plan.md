

## Build "Mon Village" Member Management Screen

Replace the placeholder `VillageSettings.tsx` with a full member management screen following the liquid glass design system.

### Structure

**VillageSettings.tsx** -- Main page with:
- Header: back button (ArrowLeft) + "Mon Village" title (Fraunces font)
- Two filter tabs ("Professionnels" / "Famille") filtering by `type` column (`pro` / `famille`)
- Active tab styled with Lavande (#8B74E0) background, inactive with transparent liquid glass
- List of active intervenants fetched from Supabase (`actif = true`, filtered by current `enfant_id`)
- Each member row: liquid glass card with colored avatar (first letter, gradient based on specialite), nom, specialite, trash icon
- "Ajouter un membre" button at the bottom

**Add Member** -- Dialog modal:
- Fields: `nom` (text input), `specialite` (text input), `type` (select: "pro" | "famille")
- On confirm: insert into `intervenants` with `actif: true` and `enfant_id` from `useEnfantId()`
- On cancel: close without saving

**Delete Member** -- AlertDialog:
- Message: "Retirer [nom] du village ?"
- On confirm: `UPDATE intervenants SET actif = false WHERE id = ...`
- Member disappears from list, row preserved for memo references

### Avatar Color Mapping

Map specialite to domain colors from Knowledge File:
- Kine / moteur keywords -> Corail gradient (#E8736A -> #E8845A)
- Psychomotricite -> Lavande gradient (#8B74E0 -> #5CA8D8)
- Ergotherapie -> Menthe gradient (#44A882 -> #4E96C8)
- Parent / famille -> Corail-Rose gradient (#E8736A -> #C85A8A)
- Default (Medecin, admin, other) -> Gris gradient (#8A9BAE -> #6B7F94)

### Technical Details

- Reuse `useEnfantId()` hook for getting current child ID
- Reuse `useAuth()` for auth guard
- Use existing UI components: `Dialog`, `AlertDialog`, `Input`, `Select`, `Button`
- All styling inline or with Tailwind, following liquid glass recipe from Knowledge File
- No changes to any other page or component
- Single file change: `src/pages/VillageSettings.tsx`

