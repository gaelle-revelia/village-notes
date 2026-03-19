

## Plan: Filter button + collapsible panel (matching Timeline pattern)

### Current state

The sticky header in OutilsQuestions has 4 rows: title bar, search field, status chips, specialty chips — all permanently visible. The main Timeline uses a `SlidersHorizontal` filter button next to the search field that opens a `<Drawer>` (bottom sheet).

### Approach

Instead of a bottom Drawer (which feels heavy for just a few chips), use a **collapsible panel** that slides down below the search row — toggled by the filter button. This is simpler and feels more inline. A click-outside handler or re-tap closes it.

### Changes — `src/pages/OutilsQuestions.tsx` only

**1. Header restructure — keep only 2 rows in sticky header:**
- Row 1: back arrow + title + "+" button (unchanged)
- Row 2: filter button + search field (same layout as Timeline.tsx lines 264-315)

**2. Add filter button** (left of search, same as Timeline):
- Import `SlidersHorizontal` from lucide-react
- Add `filterPanelOpen` boolean state
- Button: 42×42px, borderRadius 14, glass style, toggles `filterPanelOpen`
- Active indicator: purple dot (7px) when `statusFilter !== "all"` or `specFilter !== null`
- Icon color: `#8B74E0` when active, `#9A9490` when inactive

**3. Collapsible filter panel** — rendered inside the header, below Row 2:
- Wrapped in a `div` with `overflow: hidden`, `maxHeight` animated between 0 and a generous value (e.g. 300px), `transition: max-height 0.25s ease`
- Contains existing Row 3 (Statut label + chips) and Row 4 (Intervenant label + chips)
- Add a "Réinitialiser" button at bottom when any filter is active (same as Timeline drawer)

**4. Close on outside click:**
- When `filterPanelOpen` is true and user taps outside the header, close it
- Reuse the existing `handleMainClick` pattern or add a simple check

**5. Remove** rows 3 and 4 from always-visible header — they move into the collapsible panel.

### No changes to:
- Filter logic (`statusFilter`, `specFilter`, `searchQuery`, `filteredQuestions`)
- Card layout, edit mode, or any other component

