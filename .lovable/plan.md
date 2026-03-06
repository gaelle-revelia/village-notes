

## Plan: Create `backfill-pepites` Edge Function

### New file: `supabase/functions/backfill-pepites/index.ts`

Pattern matches existing functions (CORS, manual Bearer auth, Lovable AI gateway).

**Flow:**
1. Auth check (Bearer token)
2. Parse body: `enfant_id`, `axes[]`
3. Create Supabase client with user's token
4. Query `enfants` table — if not found return 400, if `backfill_done = true` return 200 early
5. Fetch all `memos` where `enfant_id` matches and `processing_status = 'done'`
6. Loop through each memo:
   - Extract `content_structured.resume`
   - Call `google/gemini-2.5-flash` with the specified prompt (axes formatted as `- ID: uuid | Label: label`)
   - Parse response → `axe_ids` array (0-2 items)
   - INSERT into `pepites` with `ON CONFLICT DO NOTHING`
   - On any error for a single memo: `console.error` and continue
7. UPDATE `enfants` SET `backfill_done = true`
8. Return `{ pepites_created: count }`

### Config update: `supabase/config.toml`

Add:
```toml
[functions.backfill-pepites]
verify_jwt = false
```

### What won't be touched
- All existing edge functions and tables
- No frontend changes

