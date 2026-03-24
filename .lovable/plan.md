

## Plan: Insert StepMateriel as step 5 in Onboarding.tsx

**File**: `src/pages/Onboarding.tsx` (only)

### Edits

1. **Line 14**: Add import after StepSoins import:
   ```ts
   import { StepMateriel } from "@/components/onboarding/StepMateriel";
   ```

2. **Line 16**: `TOTAL_STEPS = 6` → `TOTAL_STEPS = 7`

3. **Line 178**: `setStep(6)` → `setStep(7)` (in handleVocabulaire)

4. **Lines 229-242**: Replace StepVocabulaire block (was step 5) with StepMateriel at step 5 + StepVocabulaire at step 6:
   ```tsx
   {step === 5 && enfantId && (
     <StepMateriel
       prenomEnfant={prenomEnfant}
       enfantId={enfantId}
       onNext={() => setStep(6)}
       onSkip={() => setStep(6)}
     />
   )}
   {step === 6 && enfantId && (
     <StepVocabulaire
       prenomEnfant={prenomEnfant}
       enfantId={enfantId}
       intervenants={villageIntervenants}
       onNext={handleVocabulaire}
       onSkip={async () => {
         await supabase.from("profiles").upsert(
           { user_id: user.id, onboarding_completed: true },
           { onConflict: "user_id" }
         );
         setStep(7);
       }}
     />
   )}
   ```

5. **Line 244**: `[3, 4, 5]` → `[3, 4, 5, 6]` (enfantId error fallback)

6. **Line 255**: `step === 6` → `step === 7` (StepReady)

