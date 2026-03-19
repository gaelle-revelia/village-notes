

## Plan: Remove "Note de rendez-vous" sub-menu

### Changes in `src/components/AddMemoSheet.tsx`

1. **Change View type** (line 42): Remove `"notes"` from the union → `"main" | "activites" | "chrono-choice"`

2. **Main menu** (~line 108): Change "Note de rendez-vous" `onClick` from `setView("notes")` to `go("/nouveau-memo-vocal")` (direct navigation)

3. **Remove Notes sub-menu panel** (~lines 127-139): Delete the entire `<nav>` panel for the notes sub-menu (contains "Note vocale" / "Note écrite")

4. **Adjust sliding container**: Change from 4 panels (400%, 25% each) to 3 panels (300%, 33.33% each). Update `translateX` logic — remove the `"notes"` case, adjust percentages for `"activites"` and `"chrono-choice"`.

5. **Clean up imports**: Remove `Mic` and `PenLine` if no longer used elsewhere in the file (they're used in chrono-choice panel, so `PenLine` stays; check `Mic`).

### No other files touched.

