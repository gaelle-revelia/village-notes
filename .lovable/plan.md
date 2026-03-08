

## Plan: Settings Page + delete-account Edge Function

### 1. Rewrite `src/pages/AppSettings.tsx`

Full settings page replacing the placeholder:

- **Header**: Back arrow + "Paramètres" title (Fraunces), same pattern as ChildProfile
- **Section "Mon compte"**: Liquid glass card with email (from `useAuth()`) and prénom (fetched from `profiles` table where `user_id = auth.uid()`)
- **Section "Zone de danger"**: Card with red-tinted border `rgba(220,38,38,0.2)`:
  - Role fetched via `useEnfantId()` which returns `{ role }` 
  - If `role === 'owner'`: disabled outlined red button + italic explanatory text
  - If `role === 'coparent'` or `'famille'`: active outlined red button → opens `AlertDialog` confirmation modal
- **On confirm**: calls `delete-account` edge function via `supabase.functions.invoke('delete-account')`, then redirects to `/auth`
- No BottomNavBar, no gradient background on page (uses global gradient)

### 2. Create `supabase/functions/delete-account/index.ts`

- Same CORS pattern as invite-member (allowedOrigins + getCorsHeaders)
- Manual Bearer token auth via `supabase.auth.getUser()`
- Query `enfant_membres` for user's role — if `owner`, return 403
- Delete from `enfant_membres` where `user_id` matches
- Delete from `profiles` where `user_id` matches
- Delete auth user via admin client using `SUPABASE_SERVICE_ROLE_KEY`
- Return 200

### 3. Update `supabase/config.toml`

Add `[functions.delete-account]` with `verify_jwt = false`.

### Files changed
| File | Action |
|---|---|
| `src/pages/AppSettings.tsx` | Rewrite |
| `supabase/functions/delete-account/index.ts` | Create |
| `supabase/config.toml` | Add function entry |

### Not touched
useAuth.tsx, any other page, any existing edge function, RLS policies.

