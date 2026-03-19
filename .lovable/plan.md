
Current findings

1. Where the page currently lives
- `NouvelleQuestion` is already defined in its own file:
  - `src/pages/NouvelleQuestion.tsx`
- It is not inlined inside `OutilsScreen.tsx`.
- `src/pages/OutilsScreen.tsx` now only contains the Outils screen and navigates to the dedicated page.

2. Where the route is declared
- In `src/App.tsx`:
  - import: `import NouvelleQuestion from "./pages/NouvelleQuestion";`
  - route: `<Route path="/nouvelle-question" element={<NouvelleQuestion />} />`

3. What currently handles each concern

- Voice recording
  - Page-level UI/state: `src/pages/NouvelleQuestion.tsx`
  - Recording/transcription hook: `src/hooks/useVocalRecording.ts`
  - Current flow:
    - starts/stops recording via `useVocalRecording()`
    - `handleStopRecording()` gets the transcription
    - transcription replaces `question`
    - page switches to text mode

- Intervenant selection (multi-select)
  - Local page components inside `src/pages/NouvelleQuestion.tsx`
    - `IntervenantSelection`
    - `IntervenantRow`
  - Data fetching also lives in `NouvelleQuestion.tsx`
    - fetches `intervenants`
    - computes `recentIntervenants`
    - manages `selectedIds`
  - This is separate from memo’s single-select component:
    - `src/components/memo/IntervenantSearchPicker.tsx`

- Insert into `public.questions`
  - `handleSubmit` inside `src/pages/NouvelleQuestion.tsx`
  - Insert call:
    - `supabase.from("questions").insert({ parent_id, child_id, text, linked_pro_ids, status: "to_ask" })`

4. Entry point from Outils
- In `src/pages/OutilsScreen.tsx`
- The “Nouvelle question” button uses:
  - `onClick={() => navigate("/nouvelle-question")}`

Clean plan

Goal
- Keep all existing logic intact.
- Only reorganize structure so the page mirrors `NouveauMemoVocal.tsx` more closely:
  - date picker at top
  - intervenant multi-select
  - mic button below

Implementation plan
1. Keep `src/pages/NouvelleQuestion.tsx` as the dedicated page file
- No move is needed because it is already separated correctly.
- Treat this file as the single source of truth for the question page.

2. Restructure the JSX in `NouvelleQuestion.tsx` to match the memo page order
- Reorder the page layout to:
  - top metadata block
  - intervenant selection block
  - voice block
- Preserve the existing voice hook, search logic, selected pills, and submit logic.

3. Add a date picker at the top using the existing memo pattern
- Reuse `MemoDatePicker` from:
  - `src/components/memo/MemoDatePicker.tsx`
- Keep it UI-only if questions do not persist a date field today.
- This preserves current insert behavior while aligning the structure visually.

4. Keep intervenant multi-select exactly as-is
- Do not rewrite:
  - fetch logic
  - recent logic
  - pill logic
  - toggle logic
- Only move the rendered block so it sits above the mic section, like memo metadata appears above recording.

5. Keep the mic/transcription flow unchanged
- Continue using `useVocalRecording`
- Continue replacing question text on transcription
- Continue switching to text mode after successful transcription
- No changes to backend calls or hook behavior

6. Keep question insertion unchanged
- Leave `handleSubmit` and the `public.questions` insert payload exactly as-is
- No table or schema changes
- No changes to the navigation entry from `/outils`

Result after refactor
- File ownership remains clean:
  - route: `src/App.tsx`
  - launcher: `src/pages/OutilsScreen.tsx`
  - page/UI/submit: `src/pages/NouvelleQuestion.tsx`
  - recording logic: `src/hooks/useVocalRecording.ts`
- UX structure will visually align better with `NouveauMemoVocal.tsx` without rewriting the existing question logic.
