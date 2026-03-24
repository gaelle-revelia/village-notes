

## Plan: Remove NSM step from Onboarding

**File**: `src/pages/Onboarding.tsx` (only)

### Surgical edits

1. **Line 11**: Remove `import { StepNSM }` line
2. **Line 16**: Change `TOTAL_STEPS = 7` → `TOTAL_STEPS = 6`
3. **Lines 173**: In `handleVocabulaire`, replace `setStep(6)` with onboarding completion + `setStep(6)`:
   ```ts
   await supabase.from("profiles").upsert(
     { user_id: user.id, onboarding_completed: true },
     { onConflict: "user_id" }
   );
   setStep(6);
   ```
4. **Lines 176-196**: Delete entire `handleNSM` function
5. **Line 252**: Change `onSkip={() => setStep(6)}` → `onSkip` calls same completion logic (upsert + setStep(6))
6. **Line 266**: Remove `{step === 6 && <StepNSM .../>}`
7. **Line 267**: Change `step === 7` → `step === 6` for StepReady

Flow becomes: 1.Enfant → 2.Village → 3.Médicaments → 4.Soins → 5.Vocabulaire → 6.Ready

