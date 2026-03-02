
# Add onboarding completion flag

## Problem
Refreshing the page mid-onboarding or after completion can create duplicate `enfants` entries because there's no persistence of the "onboarding done" state.

## Approach

Since no `profiles` table exists, we'll create one. This is architecturally correct because the flag is per-user, not per-enfant.

### Part A -- Database migration

Create a `profiles` table:

```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  onboarding_completed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_profile" ON public.profiles
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Part B -- Onboarding.tsx changes

1. On mount (when `user` is available), query `profiles` for the current user's `onboarding_completed` flag.
2. If `onboarding_completed = true`, redirect to `/timeline` (show loading state while checking).
3. In `handleNSM` (step 4 -> step 5 transition), upsert `profiles` with `onboarding_completed = true`.

### Part C -- StepReady.tsx

No changes needed. The flag is set when reaching step 5, so even if the user refreshes on the final screen, they'll be redirected to `/timeline`.

### Part D -- Auth.tsx routing adjustment

Currently Auth.tsx redirects logged-in users to `/timeline`. We add a check: if logged in but `onboarding_completed = false` and no enfant exists, redirect to `/onboarding` instead. This ensures new users land on onboarding.

Actually, to keep changes minimal and respect "do not touch Auth logic", we handle it entirely in `Onboarding.tsx`:
- Query profiles on mount
- If `onboarding_completed = true` -> Navigate to `/timeline`
- If no profile row exists -> proceed with onboarding (and create the profile row at the end)

### Files modified

| File | Change |
|---|---|
| Migration SQL | Create `profiles` table with RLS |
| `src/pages/Onboarding.tsx` | Add profile check on mount, upsert profile on step 5, redirect if completed |

### Technical details

In `Onboarding.tsx`:
- Add state: `const [checkingProfile, setCheckingProfile] = useState(true)`
- Add `useEffect` that queries `profiles` where `user_id = user.id`
- If row exists with `onboarding_completed = true`, return `<Navigate to="/timeline" />`
- Otherwise, set `checkingProfile = false` and show the onboarding flow
- In `handleNSM`, after inserting the NSM score, upsert into `profiles`: `{ user_id: user.id, onboarding_completed: true }`

The upsert uses `onConflict: 'user_id'` to handle edge cases where the profile row may already exist.
