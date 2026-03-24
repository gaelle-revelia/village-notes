

## Plan: Dynamic sorting of Traitements, Soins, Matériel sections

**File**: `src/pages/ChildProfile.tsx` (only)

### Single edit — Lines 270–454

Replace the three static section blocks (Traitements lines 270-333, Soins lines 335-394, Matériel lines 396-454) with a dynamic sorted render:

1. Define a `sections` array containing three entries, each with `key`, `active` flag, and `node` (the existing JSX for that section, unchanged).
2. Render with `[...sections].sort((a, b) => Number(b.active) - Number(a.active)).map(...)` wrapped in `React.Fragment`.

### Technical details

- Import `React` if not already imported (needed for `React.Fragment`).
- The `sections` array is defined inline in the JSX return block (or just above the return).
- Each section's JSX is moved verbatim into its `node` property — no content changes.
- Sort is stable in modern JS engines, preserving original order among sections with the same active state.
- Modals, handlers, state, INFORMATIONS card — all untouched.

