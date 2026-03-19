

## Plan: Unified list with filter bar (replace tabs + checkbox)

### Summary

Remove the two-tab layout and collapsed-card checkbox. Replace with a single list of all questions, a filter bar (status chips + specialty chips + text search), and a purple left border for "Posée" cards. Status changes remain inside the expanded edit mode only.

### 1. REMOVE

- **Tabs**: Remove `<Tabs>`, `<TabsList>`, `<TabsTrigger>`, `<TabsContent>` from the page layout (~lines 859-870). Remove the `Tabs` import.
- **`activeTab` state**: Remove `activeTab` / `setActiveTab`. Remove `setActiveTab(nextStatus)` call in `handleMarkAsked`.
- **`questionsToAsk` / `askedQuestions` memos**: Remove — no longer needed.
- **Collapsed-card checkbox**: Remove the circular checkbox button from the collapsed view (~lines 745-757). The timeline dot already conveys status visually.

### 2. ADD — filter bar below sticky header

New state variables:
- `statusFilter: "all" | "to_ask" | "asked"` (default `"all"`)
- `specFilter: string | null` (default `null`)
- `searchQuery: string` (default `""`)

**Derive available specialties** from linked intervenants across all questions:
```ts
const availableSpecialties = useMemo(() => {
  const specs = new Set<string>();
  for (const q of questions) {
    for (const pid of q.linked_pro_ids) {
      const m = intervenantsById[pid];
      if (m?.specialite) specs.add(m.specialite);
    }
  }
  return Array.from(specs).sort();
}, [questions, intervenantsById]);
```

**Filter bar UI** (below header, above timeline):
```text
┌─ Status chips ──────────────────────────────┐
│  [Toutes]  [À poser]  [Posées]              │
├─ Specialty chips (if >1) ───────────────────┤
│  [Toutes]  [Kiné]  [Ergo]  [Ortho]  …      │
├─ Search field ──────────────────────────────┤
│  🔍 Rechercher…                             │
└─────────────────────────────────────────────┘
```

Chip style matches Mon Village: active = `bg-[#8B74E0] text-white shadow-md`, inactive = `bg-[rgba(255,255,255,0.52)] border border-[rgba(255,255,255,0.72)] text-[#1E1A1A]`, `px-3.5 py-1.5 rounded-[20px] text-xs font-medium`.

**Filtered questions memo**:
```ts
const filteredQuestions = useMemo(() => {
  return questions.filter(q => {
    if (statusFilter !== "all" && q.status !== statusFilter) return false;
    if (specFilter) {
      const hasSpec = q.linked_pro_ids.some(id => intervenantsById[id]?.specialite === specFilter);
      if (!hasSpec) return false;
    }
    if (searchQuery.trim()) {
      const n = normalize(searchQuery);
      const matchText = normalize(q.text).includes(n);
      const matchPrec = q.precisions && normalize(q.precisions).includes(n);
      const matchAnswer = q.answer && normalize(q.answer).includes(n);
      if (!matchText && !matchPrec && !matchAnswer) return false;
    }
    return true;
  });
}, [questions, statusFilter, specFilter, searchQuery, intervenantsById]);
```

### 3. VISUAL STATUS on cards (replaces checkbox)

**"Posée" cards** get a purple left border:
- Add `borderLeft: "3px solid #8B74E0"` to the `glassCard` style for cards where `status === "asked"`

**"À poser" cards**: normal style (no left border), empty dot on timeline (already implemented)

**"Réponse enregistrée" indicator**: already exists, no change needed.

### 4. Status toggle inside expanded card only

The existing checkbox in expanded mode (~lines 584-598) stays untouched. When toggled, `handleMarkAsked` saves the status change but no longer calls `setActiveTab` (removed). The card stays visible in the unified list (its visual style updates immediately via local state).

### Technical changes — single file: `src/pages/OutilsQuestions.tsx`

**Remove**: `activeTab` state, `questionsToAsk`/`askedQuestions` memos, `Tabs`/`TabsList`/`TabsTrigger`/`TabsContent` imports and JSX, `setActiveTab` calls, collapsed-card checkbox block.

**Add**: `statusFilter`/`specFilter`/`searchQuery` state, `availableSpecialties` memo, `filteredQuestions` memo, filter bar JSX between header and timeline, conditional `borderLeft` on cards.

**Modify**: `renderQuestionList` receives `filteredQuestions` directly. Page layout calls it once instead of twice via tabs.

