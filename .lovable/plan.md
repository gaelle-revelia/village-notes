

## Plan: Wire StepMedicaments and StepSoins into Onboarding.tsx

Six surgical edits to `src/pages/Onboarding.tsx`, no other files touched.

### Changes

1. **Lines 12-14** — Add two imports after StepReady, change TOTAL_STEPS to 7

2. **Line 171** — In `handleVocabulaire`: `setStep(4)` → `setStep(6)`

3. **Line 193** — In `handleNSM`: `setStep(5)` → `setStep(7)`

4. **Lines 220-249** — Replace the JSX step rendering block with the new 7-step mapping:
   - step 1 → StepEnfant (unchanged)
   - step 2 → StepVillage (unchanged)
   - step 3 → StepMedicaments (guarded by enfantId)
   - step 4 → StepSoins (guarded by enfantId)
   - step 5 → StepVocabulaire (guarded by enfantId, was step 3)
   - step 6 → StepNSM (was step 4)
   - step 7 → StepReady (was step 5)
   - Error fallback for missing enfantId covers steps 3, 4, and 5: `[3,4,5].includes(step) && !enfantId`

No changes to handlers (handleEnfant, handleVillage), auth guards, saving overlay, ProgressBar, or any other file.

