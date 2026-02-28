

## Fix: Liquid Glass Cards Appearing Opaque on Desktop

### Root Cause

The `RevealCard` component wraps each memo card and applies `transform: scale(1)` when visible. In CSS, **any `transform` value other than `none` creates a new stacking context**. This causes `backdrop-filter` on the child card to blur the parent's (transparent) content instead of the body gradient -- resulting in flat white cards.

### Changes (2 files)

**1. `src/pages/Timeline.tsx` -- RevealCard component (lines 115-125)**

Change the visible state `transform` from `"scale(1)"` to `"none"`:

```text
BEFORE:  transform: visible ? "scale(1)" : "scale(0.97)"
AFTER:   transform: visible ? "none" : "scale(0.97)"
```

The CSS transition engine interpolates `scale(0.97)` to `none` (equivalent to identity) smoothly, so the reveal animation is preserved. When visible, no stacking context is created, and `backdrop-filter` works correctly.

**2. `src/App.css` -- Remove Vite boilerplate**

Remove or clear the `#root` rule that sets `max-width: 1280px`, `padding: 2rem`, and `text-align: center`. This is leftover scaffolding that constrains layout on desktop and adds unwanted padding/centering.

### What is NOT touched

- No changes to MemoCard, BottomNavBar, or any other component
- No changes to the design system, colors, or liquid glass recipe
- No changes to Supabase logic, auth, or routing

