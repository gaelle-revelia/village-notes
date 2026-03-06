

## Plan: Apply timeline card visual styles to pepite cards in AxeDetail

### What exists in MemoCard (timeline)

From `MemoCard.tsx`, each type has:

1. **Card background** via `getCardStyle(type)`:
   - `vocal`/`note` (default): white glass `rgba(255,255,255,0.38)`, white border
   - `evenement`: warm tint `rgba(255,248,220,0.55)`, gold border `rgba(232,200,74,0.35)`
   - `document`: cool grey `rgba(240,243,247,0.55)`, grey border `rgba(138,155,174,0.25)`
   - `activite`: blue-violet `rgba(232,239,255,0.45)`, lavande border `rgba(139,116,224,0.2)`

2. **Type badge** (emoji + label, 9px uppercase):
   - vocal: 🎙️ Vocal #8B74E0
   - note: ✏️ Note #44A882
   - evenement: ⭐ Étape #E8C84A
   - document: 📄 Document #8A9BAE
   - activite: 🏃 Activité #8B74E0

3. **Resume text style**:
   - Default: DM Sans 14px #1E1A1A
   - `evenement`: DM Sans 14px #8A6A00 fontWeight 600
   - `activite`: Fraunces 16px bold title + stat blocks (Durée/Distance parsed from resume)

4. **Date**: DM Sans 10px #9A9490

### Changes to AxeDetail.tsx (lines 499-560)

Replace the current pepite card rendering with type-aware cards:

1. **Remove** the left border `3px solid axe.couleur` on all cards
2. **Apply** `getCardStyle`-equivalent backgrounds per `p.type`:
   - Import or inline the same style map from MemoCard
3. **Type badge**: use emoji+label format (🎙️ Vocal, ✏️ Note, etc.) instead of raw type text
4. **Resume rendering**:
   - For `activite`: parse resume with ` — ` split, show Fraunces 16px bold title + stat items (same layout as MemoCard lines 266-301)
   - For `evenement`: DM Sans 14px, color #8A6A00, fontWeight 600
   - Default: DM Sans 14px, #1E1A1A (drop Fraunces italic)
5. **Keep** the ✦ icon prefix with axe.couleur
6. **Keep** date formatting as-is
7. **Meta row order**: type badge first, then date (already the case)

### Files touched
- `src/components/progression/AxeDetail.tsx` only (lines ~499-560)

