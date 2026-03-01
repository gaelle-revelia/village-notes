

# Auto-link invited users — idempotent implementation

## Overview

Add logic in `useAuth.tsx` to automatically insert invited users into `enfant_membres` on first sign-in, using `.upsert()` with `ignoreDuplicates: true` for true idempotency.

## Idempotency approach

Use `.upsert()` instead of `.insert()`:

```typescript
await supabase
  .from("enfant_membres")
  .upsert(
    {
      enfant_id: meta.enfant_id,
      user_id: session.user.id,
      role: meta.role,
    },
    { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
  );
```

This maps to `INSERT ... ON CONFLICT (enfant_id, user_id) DO NOTHING` at the Postgres level. No error is thrown if the row already exists, and the existing row is not modified.

## Implementation in `src/hooks/useAuth.tsx`

Inside the `onAuthStateChange` callback, after setting state:

1. Check if `_event === "SIGNED_IN"` and `session.user.user_metadata` contains both `enfant_id` and `role`
2. If yes, call `.upsert()` with `ignoreDuplicates: true`
3. On success, clear the invitation metadata from the user profile via `supabase.auth.updateUser({ data: { enfant_id: null, role: null } })` to prevent re-processing on subsequent logins
4. If no metadata, do nothing (normal login flow)

```typescript
export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Auto-link invited users to enfant_membres
        if (_event === "SIGNED_IN" && session?.user) {
          const meta = session.user.user_metadata;
          const enfantId = meta?.enfant_id;
          const role = meta?.role;
          if (enfantId && role) {
            const { error } = await supabase
              .from("enfant_membres")
              .upsert(
                {
                  enfant_id: enfantId,
                  user_id: session.user.id,
                  role: role,
                },
                { onConflict: "enfant_id,user_id", ignoreDuplicates: true }
              );
            if (!error) {
              // Clear metadata so this doesn't re-trigger
              supabase.auth.updateUser({
                data: { enfant_id: null, role: null },
              });
            }
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, signOut };
}
```

## Why this is safe

- `upsert` with `ignoreDuplicates: true` = Postgres `ON CONFLICT DO NOTHING` -- no error, no overwrite
- Runs on every `SIGNED_IN` event but only inserts once (UNIQUE constraint on `enfant_id, user_id`)
- Metadata cleanup after insert prevents unnecessary future upsert calls
- RLS on `enfant_membres` already allows authenticated INSERT (`WITH CHECK (true)`)
- No migration needed -- existing table and constraints handle everything

## Files to modify

| File | Change |
|---|---|
| `src/hooks/useAuth.tsx` | Add auto-linking logic with `.upsert()` on `SIGNED_IN` event |

No new files. No migration needed.

