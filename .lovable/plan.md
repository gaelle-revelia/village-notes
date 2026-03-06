

## Plan: Carte de Progression main view on /selena

### New file: `src/components/progression/AxeCard.tsx`

Standalone component receiving an axe object and its pepites array.

**Props**: `{ axe: { id, label, couleur, ordre }, pepites: { id: string, created_at: string }[], onClick: (id: string) => void }`

**Rendering**:
- Liquid glass card with left border 3px solid axe.couleur
- Top row: colored dot 8px + label (Fraunces 15px) + ChevronRight 16px right-aligned
- SVG mini constellation (height 52px, full width):
  - One circle per pepite, positioned deterministically using a simple hash of pepite.id
  - Radius 3–6px based on recency, fill axe.couleur, opacity 0.40–0.85
  - CSS keyframe animation on opacity only (random duration 2.5–5s, random delay 0–1s)
  - If 0 pepites: 5 dashed circles + italic empty-state text
- onClick → console.log(axe.id) for now

### Modified file: `src/pages/SelenaScreen.tsx`

**New data fetching** (inside the existing useEffect or a second one):
1. Fetch `enfants.date_naissance` for enfantId
2. When `hasAxes` is true, fetch axes from `axes_developpement` (actif=true, order by ordre ASC)
3. For each axe, fetch pepites joined with memos.created_at

**Header section** (replaces the current empty `{hasAxes && null}`):
- Avatar circle 44px with gradient background, initial letter
- Child name (Fraunces 22px) + computed age from date_naissance (DM Sans 11.5px #9A9490)
- Badge pill "✦ Carte de Progression"
- Intro text italic

**Axes list**:
- Section row: "AXES ACTIFS" left, "Archives" right
- Map over fetched axes → render `<AxeCard />` for each

### What won't be touched
- CarteProgressionOnboarding, useAuth, BottomNavBar, any other page

### Age computation
- `differenceInYears` + `differenceInMonths` from date-fns (already installed)
- Format: "X ans et Y mois" or "X mois" if < 1 year
- Omitted entirely if date_naissance is null

