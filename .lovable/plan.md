
Implement a new dedicated page for question creation and make `/outils` link to it, while keeping the existing `public.questions` insert logic intact.

1. Routing + entry point
- Add a new route, e.g. `/nouvelle-question`, in `src/App.tsx`.
- Create a new page file for the full-screen flow, following the same creation-page header pattern as `Nouveau mémo`:
  - back arrow
  - title `Nouvelle question`
- Update `src/pages/OutilsScreen.tsx` so the current `Nouvelle question` trigger navigates to this page instead of opening the modal.
- Remove the question-modal state/rendering from `/outils` only; leave the rest of `/outils` unchanged.

2. Page UX structure
- Build the new page with a `mode: "voice" | "text"` state, defaulting to `"voice"`.
- Back button behavior: always return to `/timeline` per your clarification.
- In text mode, keep the existing form structure:
  - `Votre question` textarea at the top
  - selected professionals pills above search
  - search + récents list
  - `Ajouter` button at the bottom

3. Voice input behavior
- Match the `Nouveau mémo` voice UX visually and structurally:
  - centered large mic button
  - timer while recording
  - permission error block if mic access is denied
  - `Saisir en texte à la place` link below
- Important constraint: `Nouveau mémo` does not expose a reusable recording component for that exact UI, and you asked not to touch that page/components.
- So I will implement the same UX pattern locally on the new page, without modifying `Nouveau mémo`.
- On stop:
  - transcribe the audio
  - replace the current question text with the transcription
  - switch to text mode so the parent can review/edit before submitting

4. Recording/transcription implementation
- Reuse the existing app transcription flow rather than inventing a new backend path.
- Use the existing recording/transcription hook already present in the app for “record → transcribe text”, then map its result into the question textarea.
- Keep the short-recording and transcription error handling already established in the app.
- No changes to database schema or backend tables.

5. Intervenant selection
- Reuse the same selection behavior already implemented for the question flow:
  - search field `Nom ou spécialité...`
  - `Récents` list
  - colored avatar + name + specialty
  - tap to toggle selection
  - multiple selection allowed
- Keep selected professionals as pills above the search field.
- Update pill styling so each pill uses that professional’s own avatar gradient/color instead of the fixed purple treatment.
- Keep the pill `✕` action synced with the selected state in the list.

6. Submit behavior
- Keep the current insert payload unchanged:
  - `parent_id = auth.uid()`
  - `child_id = current child`
  - `text = question`
  - `linked_pro_ids = selected ids`
  - `status = 'to_ask'`
- On success:
  - show the same success toast
  - navigate away from the page (recommended: back to `/outils` or `/timeline`; since your only explicit navigation rule is for the back arrow, I would keep post-submit consistent with the existing question flow unless you want it changed in implementation)

7. Files likely affected
- `src/App.tsx` — add route
- `src/pages/OutilsScreen.tsx` — replace modal trigger with navigation, remove modal markup/state
- `src/pages/NouvelleQuestion.tsx` — new full-page creation flow
- Optional: a new local helper component only if needed to keep the new page readable; no changes to memo components/pages

8. What will stay untouched
- `Nouveau mémo` page and its components
- timeline cards/logic
- question insert rules/data shape
- all other pages and tables
