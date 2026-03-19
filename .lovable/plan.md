

## Plan: Always show "Réponse reçue" + checkbox switches tab

### Changes in `src/pages/OutilsQuestions.tsx` only

#### 1. "Réponse reçue" always visible in edit mode

Around line 653, remove the `{isAsked && (` conditional wrapping the answer field block. The `<div className="space-y-1">` with the label "Réponse reçue" and the textarea will render whenever a card is expanded, regardless of status.

#### 2. Checkbox saves answer draft + switches to "Posées" tab

In `handleMarkAsked` (line 434):
- When toggling **to "asked"**: also include the answer draft from `drafts[question.id]?.answer` in the update payload (if non-empty)
- After successful save, call `setActiveTab("asked")`
- Close the card via `closeCard()` (flush saves first) so it doesn't remain expanded in the wrong tab

When toggling **back to "to_ask"** (unchecking): switch tab to `setActiveTab("to_ask")` for consistency.

### Technical details

**handleMarkAsked** changes:
```text
- Build update payload: { status, asked_at }
- If nextStatus === "asked" and drafts[question.id]?.answer is truthy,
  add answer to payload
- After success: updateQuestionLocally with full payload
- setActiveTab(nextStatus)
- If editingId === question.id, close card
```

**Answer field**: Remove `{isAsked && (` wrapper and its closing `)}` around the answer block (~line 653 and ~665).

