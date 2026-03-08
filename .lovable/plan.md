

## Plan: Add debug console.log statements

Minimal changes — no logic modifications, only `console.log` additions.

### File 1 — `src/pages/OnboardingInvite.tsx`

**After line 302** (after `const newUser = signUpData?.user;`):
```ts
console.log("[invite] signUpData:", JSON.stringify(signUpData));
console.log("[invite] newUser:", newUser?.id);
```

**After line 310** (after `const inviteToken = localStorage.getItem("invite_token");`):
```ts
console.log("[invite] inviteToken:", inviteToken);
```

**After line 318** (after the `functions.invoke` call, before the `if (fnError)` check):
```ts
console.log("[invite] fnError:", fnError);
```

### File 2 — `supabase/functions/verify-invite-token/index.ts`

**After line 18** (after `const { token, mark_used, user_id } = await req.json();`):
```ts
console.log("[verify-invite] received:", JSON.stringify({ token, mark_used, user_id }));
```

**After line 67** (after the `enfant_membres` upsert, before the existing `if (membresErr)`):
```ts
console.log("[verify-invite] enfant_membres result:", membresErr);
```

**After line 86** (after the `profiles` upsert, before the existing `if (profileErr)`):
```ts
console.log("[verify-invite] profiles result:", profileErr);
```

### Post-edit
Deploy `verify-invite-token` edge function after modification.

