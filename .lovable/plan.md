

## Plan: Add error handling to verify-invite-token upserts

### Root cause
The two upserts in verify-invite-token fire-and-forget — errors are never captured, logged, or returned. The token gets marked `used` even if provisioning failed.

### File 1 — `supabase/functions/verify-invite-token/index.ts`

**Lines 59-77**: Capture errors from both upserts, log them, and if either fails, return a 500 error to the client WITHOUT marking the token as used.

```ts
if (user_id) {
  const { error: membresErr } = await supabaseAdmin.from("enfant_membres").upsert(...);
  if (membresErr) {
    console.error("enfant_membres upsert failed:", membresErr);
    return new Response(JSON.stringify({ error: "Failed to provision membership" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { error: profileErr } = await supabaseAdmin.from("profiles").upsert(...);
  if (profileErr) {
    console.error("profiles upsert failed:", profileErr);
    return new Response(JSON.stringify({ error: "Failed to provision profile" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
}
// Only then mark token as used
```

This ensures the token stays `pending` if provisioning fails, allowing retry.

### File 2 — `src/pages/OnboardingInvite.tsx`

**Lines 305-310**: Capture the result of `supabase.functions.invoke` and check for errors before calling `onDone()`.

```ts
const inviteToken = localStorage.getItem("invite_token");
if (inviteToken) {
  const { error: fnError } = await supabase.functions.invoke("verify-invite-token", {
    body: { token: inviteToken, mark_used: true, user_id: newUser?.id },
  });
  if (fnError) {
    setError("Erreur lors de la création de votre accès. Veuillez réessayer.");
    setSaving(false);
    return;
  }
}
```

### No other files touched.

