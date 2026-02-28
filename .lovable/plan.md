

## Fix MemoCard layout and Timeline dots to match design spec

### 1. Refactor MemoCard.tsx — card layout and styling

**Line 1 (card-meta):** Restructure the flex row:
- LEFT side (`flex items-center gap-[7px]`):
  - Domain dots: change from 6px to **7px** diameter
  - Add vertical **separator**: 1px wide, 11px tall, `rgba(0,0,0,0.1)`
  - Avatar circle: **20px**, gradient per specialite, Lucide icon at **10px** white
  - Prenom: DM Sans **11px**, weight 500, color `#1E1A1A`
- RIGHT side:
  - Date only: DM Sans **10px**, color `#9A9490`

**Line 2 (resume):** Change font to **12.5px**, line-height **1.45**, color `#1E1A1A`

**Card container:**
- Padding: change from `16px 20px` to **`11px 13px`**
- Box-shadow: remove the extra `0 1px 3px` sub-shadow

**When no intervenant:** Still show dots + separator area but skip avatar and prenom

### 2. Refactor Timeline.tsx — timeline dots and line

**Timeline dot** (replace current solid circle):
```css
width: 11px
height: 11px
border-radius: 50%
background: rgba(255,255,255,0.7)
backdrop-filter: blur(4px)
border: 2.5px solid [primaryDomainColor]
box-shadow: 0 0 0 3px [primaryDomainColor at 14% opacity]
margin-top: 13px
z-index: 1
```

**Timeline line:**
- Remove `opacity: 0.25`
- Use opacity-in-color stops: `rgba(232,115,106,0.4)`, `rgba(139,116,224,0.4)`, `rgba(68,168,130,0.3)`
- Add `border-radius: 2px`

**Replace inline card JSX** in Timeline.tsx with `<MemoCard memo={memo} />` import to eliminate duplication.

### 3. Files changed

| File | Change |
|------|--------|
| `src/components/memo/MemoCard.tsx` | Restructure layout, fix sizes, add separator, fix fonts/padding |
| `src/pages/Timeline.tsx` | Fix dot style, fix line gradient, replace inline card with MemoCard import |

### Technical details

- MemoCard will need to export `getDomainsFromTags` (or a `getPrimaryDomainColor` helper) so Timeline can use it for the timeline dot color
- Timeline already has domain color logic duplicated — will remove it and import from MemoCard
- The `RevealCard` wrapper in Timeline stays as-is (not in scope)
- No changes to data fetching, routing, auth, bottom nav, FAB, or header

