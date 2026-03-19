

## Plan: Timeline layout for Questions + Answer indicator

### 1. Collapsed card — timeline layout

Replace the current `flex flex-col gap-3` list in `renderQuestionList` with a timeline structure matching the main timeline:

```text
┌─ relative container, paddingLeft: 44 ─────────────────┐
│ ┌─ absolute vertical line (left:16, width:1.5) ──┐    │
│ │  gradient corail→lavande→menthe                │    │
│ └────────────────────────────────────────────────┘    │
│                                                       │
│  ● ─── [card] ──────────────────────────────────────  │
│  ○ ─── [card] ──────────────────────────────────────  │
│  ● ─── [card] ──────────────────────────────────────  │
└───────────────────────────────────────────────────────┘
```

**Dot logic:**
- **Filled purple** (`#8B74E0`, 11px) → status `"asked"` OR has non-empty answer
- **Empty circle** (border `#8A9BAE`, 11px, transparent bg) → `"to_ask"` without answer

**Card changes (collapsed only):**
- Remove the checkbox from the left — the dot replaces it visually (checkbox moves inside card or stays as-is per "do not touch edit mode")
- Actually: keep the checkbox inside the card content area, just restructure the outer wrapper to use the timeline dot layout
- Add **date top-right** of card: `format(created_at, "d MMM", { locale: fr })` → e.g. "14 mars", text 11px, muted color
- **Précisions**: add `line-clamp-2` (2-line truncation with ellipsis)

### 2. Answer indicator on collapsed cards

When `question.answer` is non-empty (regardless of status), render at the bottom of the collapsed card:

```tsx
<div className="flex items-center gap-1.5">
  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#7F77DD' }} />
  <span style={{ fontSize: 11, fontWeight: 500, color: '#534AB7' }}>Réponse enregistrée</span>
</div>
```

### 3. Expanded card in timeline

When a card is expanded, it keeps its current edit UI but sits inside the same timeline layout (dot + left padding). The dot for expanded cards follows the same filled/empty logic.

### Technical changes — `src/pages/OutilsQuestions.tsx` only

**`formatDate` helper**: Add a short variant (no year) → `formatShortDate`:
```ts
function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(value));
}
```

**`renderQuestionList`** (lines 504-742):
- Outer wrapper: `relative`, `paddingLeft: 44`
- Add absolute vertical line div (same gradient as Timeline.tsx)
- Each item wrapper: `relative`, `marginBottom: 16`
- Add absolute dot div at `left: -32`, `marginTop: 13`
- Keep `<article>` with `glassCard` style but remove `flex items-start gap-3` (checkbox no longer at left)
- Move checkbox inline within the card content (at the end of the first line, or keep it where the user can still tap it)
- Collapsed: add date top-right, truncate précisions, add answer indicator
- Expanded: unchanged edit UI

**Keeping the checkbox accessible**: Move it to the right side of the question text row in collapsed mode (small circular check button). In expanded mode it stays as-is.

