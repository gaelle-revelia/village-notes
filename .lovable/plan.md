

## Add contact detail columns to `intervenants`

### Migration SQL

```sql
ALTER TABLE public.intervenants
  ADD COLUMN telephone text,
  ADD COLUMN email text,
  ADD COLUMN structure text,
  ADD COLUMN notes text;
```

### Why this is safe

- All four columns are nullable with no NOT NULL constraint and no default needed
- Existing rows get NULL for each new column -- no data modification
- No impact on existing inserts (onboarding, VillageSettings) since these columns are optional
- RLS policies are unaffected (they only reference `enfant_id`)
- No index or trigger changes required

### After migration

- The generated types file will automatically include `telephone`, `email`, `structure`, and `notes` in the `intervenants` Row/Insert/Update types
- The VillageSettings screen can later be updated to display and edit these fields
- No immediate code changes are required for existing functionality

