

## Design System Migration — Global Styles

This plan updates the two global configuration files (`tailwind.config.ts` and `src/index.css`) plus `index.html` to align with the new design system from the Knowledge File. No page or component files are touched.

---

### File 1: `index.html`

**Replace** the Google Fonts link (currently loading Crimson Text + Inter) with:
- **DM Sans** weights 300, 400, 500, 600
- **Fraunces** weight 600

Remove the old `<link>` tags for Crimson Text/Inter fonts.

---

### File 2: `tailwind.config.ts`

**Top-level `fontFamily`** (lines 15-27) — replace both entries:
- `sans`: `['DM Sans', 'sans-serif']`
- `serif`: `['Fraunces', 'serif']`

**Extended `fontFamily`** (lines 115-149) — replace all three:
- `sans`: `['DM Sans', 'sans-serif']`
- `serif`: `['Fraunces', 'serif']`
- `mono`: remove `Space Mono`, keep standard system monospace stack

This eliminates Inter, Crimson Text, and Lora from the Tailwind config entirely.

---

### File 3: `src/index.css`

**Google Fonts imports** (lines 1-5) — replace all five `@import` lines with two:
- `DM+Sans:wght@300;400;500;600`
- `Fraunces:opsz,wght@9..144,600`

**CSS custom properties `:root`** (lines 11-75) — update to new design system values:

| Variable | New HSL value | Hex reference |
|---|---|---|
| `--background` | `0 0% 100%` (transparent — actual bg via body gradient) | -- |
| `--foreground` | `12 8% 11%` | `#1E1A1A` |
| `--card` | `0 0% 100%` | white (cards use liquid glass in components) |
| `--card-foreground` | `12 8% 11%` | `#1E1A1A` |
| `--popover` | `0 0% 100%` | white |
| `--popover-foreground` | `12 8% 11%` | `#1E1A1A` |
| `--primary` | `4 68% 66%` | `#E8736A` (corail) |
| `--primary-foreground` | `0 0% 100%` | white |
| `--secondary` | `258 58% 67%` | `#8B74E0` (lavande) |
| `--secondary-foreground` | `0 0% 100%` | white |
| `--muted` | `20 6% 96%` | light neutral |
| `--muted-foreground` | `16 5% 59%` | `#9A9490` |
| `--accent` | `155 42% 47%` | `#44A882` (menthe) |
| `--accent-foreground` | `0 0% 100%` | white |
| `--destructive` | `4 68% 50%` | red |
| `--destructive-foreground` | `0 0% 100%` | white |
| `--border` | `0 0% 90%` | neutral light border |
| `--input` | `0 0% 90%` | same |
| `--ring` | `258 58% 67%` | lavande |

**Remove old custom tokens** (lines 42-47):
- `--vert-nature`, `--ocre-doux`, `--rouge-enregistrement`, `--violet-doux`, `--gris-tag`

These are replaced by the new domain color system defined in the Knowledge File (corail, lavande, menthe, abricot, gris) which will be applied at the component level in a later step.

**Remove `--font-sans`, `--font-serif`, `--font-mono`** CSS variables (lines 63-65) — these duplicate Tailwind config and reference old fonts.

**Body rule** (lines 128-130) — add the gradient background:
```css
body {
  @apply text-foreground font-sans;
  background: linear-gradient(150deg, #F9EDE8 0%, #F0EAF8 45%, #E8EFF8 100%);
  min-height: 100vh;
}
```

**Heading rule** (lines 132-134) — update from Crimson Text to Fraunces:
```css
h1, h2, h3, h4 {
  font-family: 'Fraunces', serif;
  font-weight: 600;
}
```

**Dark mode block** (lines 78-120) — keep structure but update `--foreground`, `--muted-foreground` to match new palette tones. This is low priority since the app doesn't use dark mode, but we keep it consistent.

---

### What is NOT changed

- No page files (Timeline, MemoResult, Auth, etc.)
- No component files
- No routing or backend logic
- `src/App.css` is untouched (it's Vite boilerplate, harmless)

### Impact

After this change, every element using `font-sans` or `font-serif` Tailwind classes will render in DM Sans / Fraunces. The body gradient will appear globally. Components still using hardcoded hex values will be migrated in a separate step.

