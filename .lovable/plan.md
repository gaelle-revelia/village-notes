

## Plan: Create `generate-axes` Edge Function

### What will be created

**1. `supabase/functions/generate-axes/index.ts`**
- CORS headers (same pattern as other functions)
- Manual Bearer token auth check
- Parse JSON body: `enfant_id`, `prenom_enfant`, `reponse_1`, `reponse_2`, `reponse_3`
- Call Lovable AI gateway with `google/gemini-2.5-flash` and the specified prompt
- Parse JSON response, return `{ axes: [...] }`
- Handle 429/402 errors, parse failures (500 + `{ error: "parse_failed" }`)

**2. `supabase/config.toml`**
- Add `[functions.generate-axes]` with `verify_jwt = false`

### What won't be touched
- All existing edge functions (process-memo, generate-lexique, etc.)
- No database changes
- No frontend changes

