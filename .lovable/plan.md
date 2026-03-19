

## Analysis

### 1. Current Timeline filter (Drawer)
- **State**: `filterDrawerOpen` (boolean), toggled by filter button (`setFilterDrawerOpen(true)`) at line 267
- **Component**: `<Drawer>` from `@/components/ui/drawer` (lines 480-525) — a bottom sheet overlay
- **Content**: Wraps the same `FILTER_PILLS` chips + a "Réinitialiser" button
- **Imports**: `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` (lines 13-18)

### 2. OutilsQuestions slide-down pattern
- **State**: `filterPanelOpen` (boolean), toggled via `setFilterPanelOpen((v) => !v)` on the filter button
- **Technique**: A plain `<div>` with `maxHeight: filterPanelOpen ? 300 : 0` + `transition: "max-height 0.25s ease"` + `overflow: hidden` — no overlay, no portal, inline in the page flow below the search bar
- **Button style**: Same 42×42 glass button, background changes when open

### 3. Minimal changes in Timeline.tsx

**Remove:**
- `Drawer`, `DrawerContent`, `DrawerHeader`, `DrawerTitle` imports (lines 13-18)
- The entire `<Drawer>` block (lines 479-525)

**Rename state:**
- `filterDrawerOpen` → `filterPanelOpen` (cosmetic, for consistency)

**Modify filter button** (line 267):
- Change `onClick` from `setFilterDrawerOpen(true)` to `setFilterPanelOpen(v => !v)` (toggle instead of open-only)
- Adjust button background to reflect open state like OutilsQuestions

**Add slide-down div** right after the search bar row (after line ~330), inside the sticky header:
```tsx
<div style={{
  overflow: "hidden",
  maxHeight: filterPanelOpen ? 300 : 0,
  transition: "max-height 0.25s ease",
}}>
  <div className="flex flex-wrap gap-2 pt-2">
    {/* existing FILTER_PILLS.map — unchanged */}
  </div>
  {isFilterActive && (
    /* existing Réinitialiser button — unchanged */
  )}
</div>
```

**Total**: ~30 lines changed, filter chips and toggle logic stay identical.

