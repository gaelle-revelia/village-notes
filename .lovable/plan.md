

## Replace Edit Dialog with Slide-In Detail Panel

### What changes

**Single file**: `src/pages/VillageSettings.tsx`

Replace the current `<Dialog>` edit modal (lines 394-488) with a custom slide-in panel rendered via `createPortal`.

### Panel Component: `MemberDetailPanel`

An inline component (or section within the same file) that renders via `createPortal(document.body)` when `editTarget` is set.

**Overlay**:
- Fixed fullscreen, `bg-black/30`, z-50
- Tap to close (sets `editTarget` to null without saving)
- Fade-in 300ms

**Panel container**:
- Fixed, `inset-y-0 right-0`, z-50
- Width: `w-[65%]` on mobile, `md:w-[40%]` on desktop
- Background: `rgba(255,255,255,0.85)`, `backdrop-filter: blur(20px) saturate(1.5)`
- Border-left: `1px solid rgba(255,255,255,0.65)`
- Shadow: `box-shadow: -4px 0 24px rgba(0,0,0,0.08)`
- Slide animation: CSS transition `transform 300ms ease` from `translateX(100%)` to `translateX(0)`
- Overflow-y auto for scrolling on small screens

**Panel header**:
- Close button (X icon) top-right
- Large avatar: 56px circle with gradient (reusing `getAvatarGradient`), first letter
- Member name in DM Sans 18px semibold #1E1A1A
- Specialite in DM Sans 14px #9A9490
- Type badge: small pill "Pro" or "Famille" with Lavande bg for Pro, Corail-Rose for Famille

**Editable fields section** (4 fields, each as a labeled block):
- Label: DM Sans 11px uppercase tracking-wider, color #9A9490
- Value: DM Sans 14px, color #1E1A1A
- When empty, show placeholder "Ajouter..." in #9A9490 italic
- Fields use `<Input>` and `<Textarea>` (for notes) with transparent/glass-like styling (`bg-white/30 border-white/50`)
- Fields: Structure / Lieu, Telephone, Email, Notes libres

**Footer**:
- "Enregistrer" button: `background: linear-gradient(135deg, #E8736A, #8B74E0)`, white text, rounded-xl
- "Annuler" text button: closes panel, resets form state

### Animation approach

Use React state to manage open/visible two-phase pattern (same as ProfileAvatar):
1. `editTarget` being set triggers portal mount with `translateX(100%)`
2. `requestAnimationFrame` flips a `visible` boolean to `true`, transitioning to `translateX(0)`
3. On close: flip `visible` to `false`, wait 300ms via `setTimeout`, then set `editTarget(null)` to unmount

### What is removed

- The entire `<Dialog open={!!editTarget}>` block (lines 394-488) -- replaced by the panel
- Dialog/DialogContent/DialogHeader/DialogTitle/DialogFooter imports can be removed if no longer used (but Add Dialog still uses them, so they stay)

### What is NOT touched

- Member list cards, filter tabs, add button, add dialog
- Delete AlertDialog (stays as-is, can still be triggered from panel)
- `getAvatarGradient`, `glassCard`, fetch/add/delete logic
- No other files, no routing, no auth changes

### Technical Details

- Touch/swipe-right-to-close: attach a `touchstart`/`touchmove`/`touchend` listener on the panel. Track horizontal delta; if swipe-right > 80px, close.
- The edit state variables (`editNom`, `editTelephone`, etc.) are reused as-is
- `handleEdit` saves to Supabase, closes panel, refetches members -- same logic, just closes panel instead of dialog
- The "Retirer" action inside the panel sets `deleteTarget` (opening the existing AlertDialog) and closes the panel

