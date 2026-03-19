

## Plan: Inline-editable question cards in OutilsQuestions.tsx

**Constraint**: Do not modify `NouvelleQuestion.tsx` in this pass.

### Summary
Each question card becomes tappable to expand into inline edit mode. One card editable at a time. Auto-save on blur with 800ms debounce. Switching cards force-saves the current one first. Intervenant picker is duplicated inline (not extracted from NouvelleQuestion in this pass).

### Files changed

| File | Action |
|---|---|
| `src/pages/OutilsQuestions.tsx` | Major rewrite of card rendering + new state + inline picker |

### State changes

- Remove `editingAnswerIds` state
- Add `editingId: string | null` — which card is expanded
- Add `drafts: Record<string, { text: string; precisions: string; linked_pro_ids: string[]; answer: string }>` — per-card editable fields
- Add `saveTimerRef = useRef<Record<string, NodeJS.Timeout>>({})` — debounce timers keyed by `questionId:field`
- Add `searchQuery: string` state for the inline intervenant picker (reset when switching cards)
- Fetch `precisions` column in the questions query (currently missing)
- Add `precisions: string | null` to `QuestionItem` type

### Data flow

1. On fetch, initialize `drafts` from question data (text, precisions, linked_pro_ids, answer)
2. On card tap (outside checkbox): if another card is open, flush its pending saves immediately, then set `editingId` to tapped card
3. On field change: update `drafts[id][field]`, start 800ms debounce timer
4. On field blur: clear debounce timer, save immediately via `supabase.from("questions").update(...)` + `updateQuestionLocally`
5. On click outside all cards (on `<main>`): flush pending saves, set `editingId = null`

### Save function

```text
flushAndSave(questionId):
  - clear all timers for that questionId
  - compare drafts[questionId] vs questions[questionId]
  - if any field changed, do single update call with all changed fields
  - updateQuestionLocally with new values

debouncedFieldChange(questionId, field, value):
  - update drafts state
  - clear existing timer for questionId:field
  - set new 800ms timer that calls saveField(questionId, field, value)
```

### Card rendering (collapsed vs expanded)

**Collapsed** (default — same as current, plus precisions):
- Circular checkbox (left) + question text (font-medium) + pro pills + precisions (muted text) + date
- Entire card clickable to expand (except checkbox)

**Expanded** (`editingId === question.id`):
- Circular checkbox still functional on the left
- Fields stacked vertically in the content area:
  1. `<input type="text">` for question text — glass style, font-medium
  2. `<textarea rows={3}>` for precisions — glass style
  3. Inline intervenant multi-select (search + list + selected chips) — duplicated from NouvelleQuestion's `IntervenantSelection` / `IntervenantRow` pattern, using the same styles and `MEMBER_PALETTES`
  4. Answer input/block — only when `status === "asked"`, same glass input style, save on blur/enter

### Inline intervenant picker (duplicated in OutilsQuestions)

Since we cannot touch NouvelleQuestion.tsx, we duplicate the following locally in OutilsQuestions.tsx:
- `normalize()` function (already exists as used in NouvelleQuestion)
- `HighlightMatch` component
- `IntervenantSelection` component (adapted: uses `intervenantsById` converted to array, `recentIds` fetched from memos)
- `IntervenantRow` component
- `searchFieldStyle` constant
- `MEMBER_PALETTES` already exists but needs `avatar` field added

The picker will:
- Show selected pro chips with X buttons
- Show search input
- Show filtered results or recent intervenants
- Toggle updates `drafts[questionId].linked_pro_ids` and triggers debounced save

### Fetching recent intervenants

Add a new `useEffect` that fetches the 3 most recent `intervenant_id` values from `memos` (same pattern as NouvelleQuestion lines 175-201). Store in `recentIds: string[]` state.

### Cleanup

- `useEffect` cleanup clears all pending timeouts from `saveTimerRef`
- Convert `intervenantsById` record to array via `useMemo` for the picker's filtering logic

### Click-outside handling

Attach `onClick` on `<main>` element. If `editingId` is set and click target is not inside `[data-question-id="${editingId}"]`, flush saves and close.

