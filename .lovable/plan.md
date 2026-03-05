

## Plan: Refactor Pick-me-up to single scrollable conversational thread

### Architecture change

Replace the `step` state (1|2|3) with a **phase** model where all content renders in one scrollable `<main>`, and blocks 2/3 appear below block 1 as the user progresses. Use `useRef` + `scrollIntoView` to auto-scroll after each transition.

### State model

```
phase: 'emotion' | 'period' | 'result'
// starts at 'emotion'
// CTA 1 tap → phase = 'period' (block 2 appears below block 1, inputs in block 1 become disabled)
// CTA 2 tap → phase = 'result' (block 3 appears below block 2, inputs in block 2 become disabled)
```

Existing state kept: `selectedEmotion`, `freeText`, `selectedPeriod`, `dateStart`, `dateEnd`, `parentPrenom`.

New state: `memoCount`, `activiteCount` (fetched from Supabase when period is confirmed).

### Single scrollable layout (top → bottom)

**Always visible (Block 1):**
1. AI bubble: "De quoi as-tu besoin aujourd'hui ?"
2. User bubble (right): "✨ Un remontant"
3. Section separator: "UN REMONTANT — [PRÉNOM]"
4. AI bubble 1: "Dis-moi comment tu te sens en ce moment."
5. AI bubble 2: "Pas besoin d'être précis(e) — quelques mots, ce qui vient."
6. Mic orb 72px + "Appuie pour parler" (centered)
7. Chips 2x2 centered (disabled after phase > emotion)
8. "ou" separator
9. Textarea right-aligned max-width 75% (disabled after phase > emotion)

**Sticky CTA** (changes based on phase):
- Phase emotion: "Continuer →" (disabled until selection)
- Phase period: "Analyser →" (disabled until period selected)
- Phase result: replaced by action bar (Copier/Partager/Modifier/Régénérer)

**Block 2 (visible when phase >= 'period'):**
10. User bubble (right): [emotion text]
11. Section separator: "PÉRIODE"
12. AI bubble: "Sur quelle période tu veux qu'on regarde ?"
13. Chips 2x2 centered (disabled after phase > period)
14. Date range picker: label "OU CHOISIR UNE PÉRIODE PRÉCISE" + DU [date] → AU [date] (pill buttons)
15. Counter card (glass): "✨ [X] mémos · [Y] activités sur [période]" — fetched via Supabase count queries on `memos` and `sessions_activite` filtered by enfant_id + date range

**Block 3 (visible when phase === 'result'):**
16. User bubble (right): [period text]
17. Section separator: "TON REMONTANT"
18. Mocked narrative text (glass card)
19. Legal mention muted 10px
20. Ref anchor for scroll-to-bottom

### Counter card data fetch

When transitioning to phase `period` and a period is selected, compute start/end dates from the selected chip or custom range, then:
```sql
SELECT count(*) FROM memos WHERE enfant_id = ? AND created_at >= ? AND created_at <= ?
SELECT count(*) FROM sessions_activite WHERE enfant_id = ? AND created_at >= ? AND created_at <= ?
```

### Navigation

- Header title: fixed "Pick-me-up"
- Back arrow: always navigates to `/outils/synthese` (no step regression — single page)

### Auto-scroll

`useRef` on a bottom anchor div. After each phase transition, call `ref.scrollIntoView({ behavior: 'smooth' })` via a `useEffect` watching `phase`.

### File touched

- `src/pages/OutilsSynthesePickMeUp.tsx` — full rewrite of the component

### Not touched
- `/outils/synthese`, `/outils/synthese/rdv`, other pages
- No edge functions, no database changes

