

## Plan: Fix ScreenPassword submit() + add RGPD checkbox in OnboardingInvite.tsx

### Changes (single file: `src/pages/OnboardingInvite.tsx`)

**1. Import Checkbox** (line 5 area)
- Add: `import { Checkbox } from "@/components/ui/checkbox";`
- Add: `import { Label } from "@/components/ui/label";`

**2. Fix submit() — lines 287-309**
- Replace `signUp` call to capture `data: signUpData`, extract `newUser = signUpData?.user`
- Remove the separate `getUser()` call
- After the existing `upsert enfant_membres` block (line 307), add profiles upsert:
  ```ts
  if (newUser) {
    await supabase.from("profiles").upsert({
      user_id: newUser.id,
      prenom: "",
      onboarding_completed: true,
      consent_version: "v1.0",
      consent_at: new Date().toISOString()
    }, { onConflict: "user_id", ignoreDuplicates: true });
  }
  ```

**3. Add consent state** (line 263 area)
- Add `const [consent, setConsent] = useState(false);`

**4. Add checkbox in JSX** (before PrimaryButton, ~line 428-429)
- Insert checkbox + label block matching SignupForm.tsx style
- Update PrimaryButton: `disabled={saving || !consent}`

No other files touched.

