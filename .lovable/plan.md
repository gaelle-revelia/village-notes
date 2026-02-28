

## Add `type` and `actif` columns to `intervenants`

### Migration SQL

A single migration adding both columns:

```sql
ALTER TABLE public.intervenants
  ADD COLUMN type text NOT NULL DEFAULT 'pro',
  ADD COLUMN actif boolean NOT NULL DEFAULT true;
```

### Why this is safe

- Both columns have DEFAULT values, so existing rows are backfilled automatically
- NOT NULL + DEFAULT means no insert path breaks (existing code never sets these fields, so they get defaults)
- RLS policies on `intervenants` reference only `enfant_id` -- unaffected
- No index or trigger changes needed

### After migration

- The generated types file (`types.ts`) will update automatically to include `type` and `actif` in the `intervenants` Row/Insert/Update types
- No code changes are required for existing functionality -- all current inserts (onboarding, etc.) will work because the new columns have defaults
- Future features can then use these columns (e.g., filtering active intervenants, distinguishing pro vs parent)

