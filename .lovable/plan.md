

## Plan: Create StepMedicaments.tsx

### Overview
Create a new standalone onboarding step component for adding medications, with a qualification gate (yes/no) before showing the form.

### Component Structure

**Phase 1 — Qualification screen** (default view)
- Two clickable cards: "Oui, je veux le renseigner" and "Non, pas de traitement"
- "Non" calls `onSkip()` immediately
- "Oui" transitions to Phase 2

**Phase 2 — Medication form**
- Title + subtitle in Fraunces/DM Sans matching StepVocabulaire
- List of added medications as dismissible cards (bg-[#EEEDFE] rounded-xl)
- Inline form with fields:
  - `nom` (Input, required)
  - `dosage` (Input, optional)
  - `voie` (single-select chips: Oral, Gastrostomie, Patch, Inhalé, Autre)
  - `frequence` (multi-select chips: Matin, Midi, Soir, Au besoin, Autre)
  - `instructions` (Textarea, optional)
  - `conditions` (Input, optional)
- "Ajouter ce médicament" button: inserts into `public.medicaments`, then fire-and-forget calls `generate-lexique` with `{ mots: [nom] }` and inserts returned entries into `enfant_lexique` with source `"onboarding_medicament"`
- "Continuer" button (enabled when ≥1 medication added), calls `onNext()`
- "Compléter plus tard" ghost link calls `onSkip()`

### Technical Details

**File**: `src/components/onboarding/StepMedicaments.tsx`

**Props**:
```typescript
interface StepMedicamentsProps {
  prenomEnfant: string;
  enfantId: string;
  onNext: () => void;
  onSkip: () => void;
}
```

**Data flow**:
1. Insert medication row into `medicaments` table via Supabase client
2. Call `generate-lexique` edge function with `{ mots: [med.nom] }`
3. If lexique entries returned, insert them into `enfant_lexique` with `source: "onboarding_medicament"` — silent catch on failure
4. On remove, delete from `medicaments` by id

**Chip styling** (inline classes):
- Inactive: `bg-white/50 border border-white/60 text-muted-foreground rounded-full px-3 py-1.5 text-sm cursor-pointer`
- Active: `bg-primary/10 border-primary text-primary font-medium rounded-full px-3 py-1.5 text-sm cursor-pointer`

**No existing files modified.**

