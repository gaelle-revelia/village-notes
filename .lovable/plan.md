

## Plan: Pick-me-up flow — 3 screens in one component

### What changes

**1. Replace `src/pages/OutilsSynthesePickMeUp.tsx`** (currently a placeholder)

Single component with `step` state (1→2→3). Reuses exact same conversational layout pattern from `OutilsSyntheseRdv.tsx` (avatar ✨ + "The Village" label + glass bubble).

**Step 1 — Emotional state:**
- IA bubble: "Comment tu te sens en ce moment ? (Ta réponse m'aide à trouver le bon angle)"
- 4 single-select chips below (ml-12 indent). Selected state: bg `#8B74E0`, white text. Default: glass card style.
- Centered mic orb (~64px, gradient `#E8736A→#8B74E0`, `Mic` icon) — non-functional, decorative
- "ou" separator (muted, centered)
- Textarea with placeholder "Écris ici si tu préfères..."
- When chip selected OR textarea has content → right-aligned user bubble appears with the text + CTA "Choisir la période →" activates
- CTA: gradient button, full width, border-radius 14px, disabled until selection

**Step 2 — Period selection:**
- New IA bubble: "Sur quelle période tu veux qu'on regarde ?"
- 4 period chips (single select, same styling)
- Optional custom date range: two date pickers (start/end) using existing `Calendar` + `Popover` components
- Selection → right-aligned user bubble + CTA "Générer mon remontant →" activates

**Step 3 — Generated document (mocked):**
- Title "Ton remontant" (Fraunces 600)
- Static mocked narrative paragraph (warm tone, about child using `useEnfantPrenom`)
- Legal mention at bottom: "Synthèse des observations de [parent] pour [enfant] · The Village · Mars 2026" (DM Sans 10px, muted). Parent name from profiles via `useAuth`.
- Fixed bottom action bar (liquid glass): 4 buttons — 📋 Copier (clipboard API + toast) · 📤 Partager · ✏️ Modifier · 🔄 Régénérer (all no-op except Copier)

**Navigation:** Back arrow: step 3→2, 2→1, 1→`/outils/synthese`. Header title changes per step.

**2. Update `src/App.tsx`** — Replace placeholder route with new component import.

### Files touched
- `src/pages/OutilsSynthesePickMeUp.tsx` — new file (replaces placeholder)
- `src/App.tsx` — update import for pick-me-up route

### Not touched
- `OutilsSynthese.tsx`, `OutilsSyntheseRdv.tsx`, any `/rdv/*`, `/transmission`, `/mdph` pages
- No edge functions, no database changes

