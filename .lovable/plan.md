

## Plan: Move DB writes to verify-invite-token edge function

### File 1 — `supabase/functions/verify-invite-token/index.ts`

**Line 15**: Extract `user_id` from body alongside `token` and `mark_used`.

**Lines 57-62**: When `mark_used` is true AND `user_id` is provided, insert two upserts before the existing `UPDATE invitations` call:

1. `supabaseAdmin.from("enfant_membres").upsert({ enfant_id: invitation.enfant_id, user_id, role: invitation.role, joined_at: new Date().toISOString() }, { onConflict: "enfant_id,user_id", ignoreDuplicates: true })`

2. `supabaseAdmin.from("profiles").upsert({ user_id, prenom: "", onboarding_completed: true, consent_version: "v1.0", consent_at: new Date().toISOString() }, { onConflict: "user_id", ignoreDuplicates: true })`

If `user_id` is absent, skip both upserts (backward compatible).

### File 2 — `src/pages/OnboardingInvite.tsx`

**Lines 304-327**: Remove the two client-side upserts (enfant_membres and profiles). Replace the `verify-invite-token` call to pass `user_id: newUser?.id`:

```ts
const inviteToken = localStorage.getItem("invite_token");
if (inviteToken) {
  await supabase.functions.invoke("verify-invite-token", {
    body: { token: inviteToken, mark_used: true, user_id: newUser?.id },
  });
}
```

This moves all DB writes to the service_role context, bypassing RLS issues when the user session isn't yet active.

