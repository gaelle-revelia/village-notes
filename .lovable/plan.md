

## Plan: Fix AxeCard constellation spacing

### File: `src/components/progression/AxeCard.tsx`

**Change 1** — Line 72: `height={52}` → `height={100}`

**Change 2** — Replace the simple hash-based positioning (lines 77-98) with anti-collision logic:

- Add a `placedCircles` array before the map
- For each pepite, compute initial candidate position using existing `hashToFloat` (adjust cy range to 8–84px for the new 100px height)
- Use absolute pixel positions (assume ~300px card width for collision math; use a fixed reference width since SVG uses %)
- Check distance to all placed circles; minimum 16px between centers
- If too close: try up to 80 alternatives by rotating around candidate (angle steps of 15°, radius steps of 8px)
- If placed successfully, push to `placedCircles` and render; otherwise skip silently
- No pepites limit — render all that fit

**Change 3** — No 12-pepite slice exists in current code (already showing all), so no removal needed.

Empty state dashed circles: adjust `cy` from 22 to ~45 to center in the new 100px height.

### Nothing else touched
- No changes to SelenaScreen, CarteProgressionOnboarding, BottomNavBar, useAuth, or any other file.

