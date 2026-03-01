

# Multi-User Access Centered on Enfant

## Overview

Transform the app from single-user-per-enfant to multi-user-per-enfant. One household = one enfant, multiple users with roles (owner, coparent, famille). This is a 9-phase implementation.

---

## Phase 1 — Create `enfant_membres` table

```sql
CREATE TABLE public.enfant_membres (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id   uuid NOT NULL REFERENCES enfants(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL DEFAULT 'coparent',
  invited_by  uuid REFERENCES auth.users(id),
  joined_at   timestamptz DEFAULT now(),
  UNIQUE(enfant_id, user_id)
);

ALTER TABLE public.enfant_membres ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_select_own_membership"
  ON public.enfant_membres FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "authenticated_can_insert"
  ON public.enfant_membres FOR INSERT
  TO authenticated
  WITH CHECK (true);
```

---

## Phase 2 — Backfill existing users

```sql
INSERT INTO public.enfant_membres (enfant_id, user_id, role)
SELECT id, user_id, 'owner'
FROM public.enfants;
```

---

## Phase 3 — Helper function

```sql
CREATE OR REPLACE FUNCTION public.get_membre_role(eid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.enfant_membres
  WHERE enfant_id = eid AND user_id = auth.uid()
  LIMIT 1;
$$;
```

---

## Phase 4 + 5 + 6 — Atomic deployment block (RLS rewrite + hook update)

These three phases MUST be deployed together. If RLS is changed without the hook update, the app breaks. If the hook changes without RLS, queries fail.

### Phase 4 — RLS rewrite on `memos`

```sql
-- Drop existing policy
DROP POLICY IF EXISTS "users_own_memos" ON public.memos;

-- New policies
CREATE POLICY "membres_select_memos" ON public.memos
  FOR SELECT TO authenticated
  USING (public.get_membre_role(enfant_id) IS NOT NULL);

CREATE POLICY "membres_insert_memos" ON public.memos
  FOR INSERT TO authenticated
  WITH CHECK (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_update_memos" ON public.memos
  FOR UPDATE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_delete_memos" ON public.memos
  FOR DELETE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));
```

### Phase 5 — RLS rewrite on `intervenants`

```sql
DROP POLICY IF EXISTS "users_own_intervenants" ON public.intervenants;

CREATE POLICY "membres_select_intervenants" ON public.intervenants
  FOR SELECT TO authenticated
  USING (public.get_membre_role(enfant_id) IS NOT NULL);

CREATE POLICY "membres_insert_intervenants" ON public.intervenants
  FOR INSERT TO authenticated
  WITH CHECK (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_update_intervenants" ON public.intervenants
  FOR UPDATE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));

CREATE POLICY "membres_delete_intervenants" ON public.intervenants
  FOR DELETE TO authenticated
  USING (public.get_membre_role(enfant_id) IN ('owner', 'coparent'));
```

### Phase 6 — Update `useEnfantId` hook

**File: `src/hooks/useEnfantId.ts`**

Change query from `enfants` table to `enfant_membres` table, and expose `role`:

```typescript
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useEnfantId() {
  const { user } = useAuth();
  const [enfantId, setEnfantId] = useState<string | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    supabase
      .from("enfant_membres")
      .select("enfant_id, role")
      .eq("user_id", user.id)
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) {
          setEnfantId(data.enfant_id);
          setRole(data.role);
        }
        setLoading(false);
      });
  }, [user]);

  return { enfantId, role, loading };
}
```

### Additional query updates required (same deployment)

Because RLS on memos now checks `enfant_id` membership (not `user_id`), the client-side `.eq("user_id", user.id)` filters must be replaced with `.eq("enfant_id", enfantId)` in these files:

| File | Current filter | New filter |
|---|---|---|
| `src/pages/Timeline.tsx` (line 85) | `.eq("user_id", user.id)` | Remove this filter (RLS handles access). Or use `.eq("enfant_id", enfantId)` if enfantId is available. |
| `src/pages/MemoResult.tsx` (line 172) | `.eq("user_id", user.id)` | Remove — RLS handles it via `enfant_id`. |
| `src/pages/MemoResult.tsx` (line 220) | `.eq("user_id", user.id)` | Remove — same reason. |
| `src/hooks/useEnfantPrenom.ts` | `enfants.eq("user_id", ...)` | Query via `enfant_membres` then fetch enfant prenom by id. |
| `src/pages/ChildProfile.tsx` | Same pattern | Same fix. |
| `src/pages/RecordMemo.tsx` | `enfants.eq("user_id", ...)` | Use `useEnfantId` hook instead. |

For memo **inserts**, the `user_id` field stays — it records who created the memo. But the RLS check is on `enfant_id`, so `enfant_id` must always be set on insert (it already is in all creation pages).

---

## Phase 7 — Frontend role restrictions

Using `role` from `useEnfantId()`:

### `src/components/BottomNavBar.tsx`
- Accept `role` prop (or use `useEnfantId` hook directly)
- If `role === 'famille'`: hide Outils tab (filter it out of the tabs array)

### `src/pages/Timeline.tsx`
- Get `role` from `useEnfantId()`
- If `role === 'famille'`: hide FAB button (don't render the `+` button)

### `src/pages/MemoResult.tsx`
- Get `role` from `useEnfantId()`
- If `role === 'famille'`:
  - Remove `onClick` handlers on editable fields (resume, details, domaines, tags, intervenant, date)
  - Hide trash icon in header
  - Fields display as read-only text without tap-to-edit behavior

---

## Phase 8 — Invitations table

```sql
CREATE TABLE public.invitations (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  enfant_id   uuid NOT NULL REFERENCES enfants(id),
  invited_by  uuid NOT NULL REFERENCES auth.users(id),
  email       text NOT NULL,
  role        text NOT NULL DEFAULT 'coparent',
  token       uuid DEFAULT gen_random_uuid() UNIQUE,
  status      text DEFAULT 'pending',
  created_at  timestamptz DEFAULT now(),
  expires_at  timestamptz DEFAULT now() + interval '7 days'
);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_invitations" ON public.invitations
  FOR ALL TO authenticated
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());
```

Note: `expires_at` uses a default expression instead of a CHECK constraint (per guidelines, validation triggers are preferred over CHECK constraints for time-based validation).

---

## Phase 9 — Invitation UI + Edge Function

### `src/pages/VillageSettings.tsx`
- When adding a member of type `famille`:
  - Add optional email field (already exists in the form)
  - Add role selector dropdown: `Co-parent` | `Famille`
  - If email is provided, insert a row into `invitations` table and call the `invite-member` edge function

### Edge Function `supabase/functions/invite-member/index.ts`
- Receives: `email`, `role`, `enfant_id`, `invited_by`
- Uses `supabase.auth.admin.inviteUserByEmail(email, { data: { role, enfant_id } })`
- Returns success/error

### Auth webhook (future)
- On user signup via invitation link, read `role` and `enfant_id` from user metadata
- Insert into `enfant_membres`
- This can be handled via a database trigger on `auth.users` insert or a separate edge function — to be detailed at implementation time

---

## Deployment order

```text
Migration 1: Phases 1 + 2 + 3 (table + backfill + function)
Migration 2: Phases 4 + 5 (RLS rewrite) — ATOMIC with Phase 6
Code deploy: Phase 6 (useEnfantId + all query updates) — same deployment
Code deploy: Phase 7 (role-based UI restrictions)
Migration 3: Phase 8 (invitations table)
Code + Function deploy: Phase 9 (invitation UI + edge function)
```

## Files to modify

| File | Change |
|---|---|
| `src/hooks/useEnfantId.ts` | Query `enfant_membres`, expose `role` |
| `src/hooks/useEnfantPrenom.ts` | Query via `enfant_membres` join |
| `src/pages/Timeline.tsx` | Remove `user_id` filter, add role-based FAB hiding |
| `src/pages/MemoResult.tsx` | Remove `user_id` filter, add read-only mode for `famille` |
| `src/components/BottomNavBar.tsx` | Hide Outils tab for `famille` role |
| `src/pages/ChildProfile.tsx` | Query enfant via `enfant_membres` |
| `src/pages/RecordMemo.tsx` | Use `useEnfantId` hook instead of direct enfants query |
| `src/pages/VillageSettings.tsx` | Add invitation flow for famille members |
| `supabase/functions/invite-member/index.ts` | New edge function for sending invitations |

## New files

| File | Purpose |
|---|---|
| `supabase/functions/invite-member/index.ts` | Edge function to invite users by email |

