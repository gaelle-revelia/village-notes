

## Bug Fix: Onboarding invite resets to Welcome after signUp

### Root Cause

After `signUp` succeeds in `ScreenPassword`, the `onAuthStateChange("SIGNED_IN")` event fires in `useAuth.tsx`. That hook detects `enfant_id` and `role` in the user metadata (passed via `signUp` options), performs an upsert in `enfant_membres`, then executes `window.location.href = "/onboarding-invite"` -- a **full page reload** that resets `step` back to 1 (Welcome screen).

```text
signUp({ data: { enfant_id, role } })
  -> triggers onAuthStateChange("SIGNED_IN") in useAuth
  -> useAuth sees enfant_id + role in metadata
  -> upsert enfant_membres (duplicate of what ScreenPassword already does)
  -> window.location.href = "/onboarding-invite"  // FULL RELOAD -> step = 1
```

### Fix 1: Stop passing enfant_id/role in signUp metadata (OnboardingInvite.tsx)

In `ScreenPassword.submit()`, remove `enfant_id` and `role` from the `signUp` options data. The upsert into `enfant_membres` is already done in ScreenPassword (lines 304-311), so useAuth's auto-link logic is redundant and harmful here.

**Before:**
```typescript
await supabase.auth.signUp({
  email,
  password: pw,
  options: { data: { enfant_id: enfantId, role: inviteRole } },
});
```

**After:**
```typescript
await supabase.auth.signUp({
  email,
  password: pw,
});
```

This prevents `useAuth` from detecting invitation metadata and triggering the page reload. The upsert remains handled locally in ScreenPassword.

### Fix 2: Prevent init() from resetting state on user change (OnboardingInvite.tsx)

The `useEffect` depends on `[user]`. After signUp, `user` changes which re-triggers `init()`. Add a guard: if we're already past step 1, skip re-initialization.

Add a ref `initDone` that prevents re-running the init logic after the first successful load.

### Fix 3: Invalidate token after signUp (OnboardingInvite.tsx + verify-invite-token)

**verify-invite-token:** Add support for an optional `mark_used: true` parameter. When present, update the invitation's `status` to `'used'` using the admin client (the new user can't update due to RLS restricting to `invited_by = auth.uid()`).

**OnboardingInvite.tsx:** After successful signUp + upsert, call `verify-invite-token` with `{ token, mark_used: true }` to invalidate the token.

### Files modified

| File | Change |
|---|---|
| `src/pages/OnboardingInvite.tsx` | Remove metadata from signUp, add init guard ref, call token invalidation after signUp |
| `supabase/functions/verify-invite-token/index.ts` | Add `mark_used` parameter support to set `status = 'used'` |

### Summary of changes in ScreenPassword.submit()

```text
1. signUp without metadata (fixes the reload)
2. upsert enfant_membres (already exists)
3. call verify-invite-token({ token, mark_used: true }) to invalidate token
4. onDone() -> setStep(3)
```

