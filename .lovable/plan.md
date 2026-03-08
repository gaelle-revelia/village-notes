

## Plan: Fix silent failure in OnboardingInvite submit()

### Root causes identified

1. **If `invite_token` is absent from localStorage**, the entire provisioning block is skipped and `onDone()` is called — user lands on timeline with no profile, no membership.
2. **No try/catch** — any thrown exception (network error, CORS) silently kills the function with no user feedback.

### Fix in `src/pages/OnboardingInvite.tsx` — `submit()` function

**Change 1 — Wrap entire async body in try/catch** (lines 269-324):
```ts
const submit = async () => {
  // validation checks stay the same
  try {
    setSaving(true);
    setError("");
    // ... existing signUp logic ...
  } catch (e: any) {
    console.error("submit error:", e);
    setError("Une erreur inattendue est survenue. Veuillez réessayer.");
    setSaving(false);
  }
};
```

**Change 2 — Fail if invite_token is missing** (after line 311):
Replace the optional `if (inviteToken)` with a mandatory check:
```ts
const inviteToken = localStorage.getItem("invite_token");
if (!inviteToken) {
  setError("Lien d'invitation invalide. Veuillez réutiliser le lien reçu par email.");
  setSaving(false);
  return;
}
// proceed with invoke...
```

This ensures provisioning is never silently skipped.

### No other files modified.

