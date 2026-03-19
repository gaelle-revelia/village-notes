
Build scope

- Add a new page file: `src/pages/OutilsQuestions.tsx`
- Register the route in `src/App.tsx` at `/outils/questions`
- Do not change database schema

What I found

1. Existing `/outils` sub-page patterns
- `OutilsActivites.tsx` and `OutilsSynthese.tsx` both use:
  - `useNavigate()` for back navigation
  - a sticky top header
  - `BottomNavBar` at the bottom
  - page-local data fetching with `useEffect`
- Header pattern is consistent:
  - left back arrow/button
  - title beside it
  - back target usually returns to `/outils`
- `OutilsActivites.tsx` is the closest structural reference for this page:
  - simple header
  - fetch-on-mount with `enfantId`
  - page-managed loading/empty states

2. Available hooks
- `useAuth()` returns `user`, `session`, `loading`, `signOut`
- `useEnfantId()` returns `enfantId`, `role`, `loading`
- These are sufficient to scope data to the signed-in parent and current child

3. Questions data access
- `public.questions` already matches the needed UI:
  - `text`
  - `linked_pro_ids`
  - `status` (`to_ask` / `asked`)
  - `answer`
  - `created_at`
  - `asked_at`
- Clean query on page load:
  - filter `parent_id = user.id`
  - filter `child_id = enfantId`
  - order by `created_at desc`
- RLS already protects this correctly for parent-owned questions

4. Intervenants resolution
- Fetch `intervenants` for the same `enfantId`
- Build a local map: `Record<string, { id, nom, specialite }>`
- Resolve each `linked_pro_ids[]` entry against that map to display pills
- For colors, reuse the same palette logic already defined in `NouvelleQuestion.tsx`:
  - `MEMBER_PALETTES`
  - `getMemberPalette(id)`
- Best approach: duplicate the small helper locally inside `OutilsQuestions.tsx` to avoid touching other files

Clean page structure

File: `src/pages/OutilsQuestions.tsx`

1. Header
- Sticky header matching existing `/outils` pages
- Left arrow button → `navigate("/outils")`
- Title: `Questions à poser`

2. Hooks + state
- Use:
  - `const navigate = useNavigate()`
  - `const { user, loading: authLoading } = useAuth()`
  - `const { enfantId, loading: enfantLoading } = useEnfantId()`
- Local state:
  - `questions`
  - `intervenantsById`
  - `tab` (`to_ask` / `asked`)
  - `answerDrafts` keyed by question id
  - `savingId` for per-card updates
  - optional `expandedAnswerId` if only one inline answer field should be open at a time

3. Data fetching
- In one `useEffect`, once `user` and `enfantId` exist:
  - fetch questions from `questions`
  - fetch active intervenants from `intervenants`
- Keep page-local loading and empty states
- No backend function required

4. Tabs
- Use existing `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`
- Tabs:
  - `À poser` → `status === "to_ask"`
  - `Posées` → `status === "asked"`

5. Question cards
- Each card shows:
  - question text
  - pro pills from `linked_pro_ids`
  - date
  - checkbox
- For dates:
  - in `À poser`, show `created_at`
  - in `Posées`, prefer `asked_at`, fallback `created_at`

6. Checkbox behavior
- Per your clarification: mark immediately
- On tick:
  - update row to `status = "asked"`
  - set `asked_at = now()`
  - reveal an optional inline answer field
- Answer field remains optional
- Saving answer updates only `answer`

7. Posées tab
- Show asked questions
- If `answer` exists, display it inline under the card content
- If no answer, keep the card clean without extra placeholder text

8. CTA
- Add a bottom or top page button:
  - label `Nouvelle question`
  - action `navigate("/nouvelle-question")`
- Best placement: below the tabs content or sticky above bottom nav if you want easy mobile access
- For consistency with `/outils`, a full-width button near the top of the content is the cleanest first version

Recommended implementation details

- Keep everything self-contained in `src/pages/OutilsQuestions.tsx`
- Only update `src/App.tsx` to import/register the route
- Avoid extracting shared helpers unless you later want the same question card elsewhere
- Suggested minimal file list:
  - `src/pages/OutilsQuestions.tsx` new
  - `src/App.tsx` route registration

Technical notes

- `linked_pro_ids` is a UUID array, so pills should be built client-side after fetching intervenants
- Since this app is mobile-first and the current viewport is 390px wide, cards should use:
  - stacked layout
  - wrapped pills
  - inline checkbox row aligned to the right or bottom
- Important caveat: `src/components/ui/button.tsx` in the provided code looks incomplete, so using native `<button>` may be safer if that file is still in its current state
- `Textarea` is available for the optional inline answer field, but it has opinionated width styling; if that causes layout issues, a native `<textarea>` would keep this page more predictable

Planned changes

1. Create `src/pages/OutilsQuestions.tsx`
2. Follow `/outils` sub-page pattern: sticky header + back to `/outils` + `BottomNavBar`
3. Fetch `questions` with `user.id` and `enfantId`
4. Fetch `intervenants` for `enfantId`
5. Resolve `linked_pro_ids` into name/color pills using local palette helpers copied from `NouvelleQuestion.tsx`
6. Add tabs `À poser` / `Posées`
7. Render question cards with text, pills, date, checkbox
8. On checkbox tick, immediately update `status="asked"` and `asked_at`
9. Show optional inline answer field and persist `answer` when edited
10. Register route in `src/App.tsx` for `/outils/questions`
