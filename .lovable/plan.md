

## Plan: Fix checkbox visibility + handle duplicate-email fake-success

### Issue 1 — Checkbox not visible

**Root cause**: The container uses `justify-center min-h-screen` without scrolling. On small viewports, content overflows and the bottom (checkbox + button) is clipped.

**Fix** in `ScreenPassword` (line 321):
- Change `justify-center min-h-screen` to `justify-start min-h-screen overflow-y-auto`
- Or wrap the form content in a scrollable container

### Issue 2 — signUp() fake-success for duplicate emails

**Root cause**: Supabase returns `{ error: null, data: { user: { id: "...", identities: [] } } }` for already-registered emails. The code treats this as success.

**Fix** in `submit()` after line 303:
```ts
const newUser = signUpData?.user;
// Detect Supabase fake-success (duplicate email)
if (!newUser || (newUser.identities && newUser.identities.length === 0)) {
  setError("Cet email est déjà associé à un compte. Essayez de vous connecter.");
  setSaving(false);
  return;
}
```

This prevents `onDone()` from being called when no real account was created, and shows a clear error message.

### Files modified
1. `src/pages/OnboardingInvite.tsx` — both fixes in ScreenPassword component

### No other files touched.

