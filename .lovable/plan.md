

## Plan: R-05 — Strict CORS Origin Allowlist

### What changes

In all 8 edge functions, replace the static `corsHeaders` object with a dynamic CORS helper that checks the request `Origin` against an allowlist.

### Pattern applied (identical in all 8 files)

**Before:**
```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, ...",
};
```

**After:**
```typescript
const allowedOrigins = [
  "https://the-village.app",
  "https://thevillage-app.lovable.app",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("origin") || "";
  const corsOrigin = allowedOrigins.includes(origin) ? origin : allowedOrigins[0];
  return {
    "Access-Control-Allow-Origin": corsOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  };
}
```

Then every `corsHeaders` reference becomes `getCorsHeaders(req)` — both in the OPTIONS preflight and all response objects.

### Files modified (CORS only, no logic changes)

1. `supabase/functions/process-memo/index.ts`
2. `supabase/functions/generate-lexique/index.ts`
3. `supabase/functions/generate-synthesis/index.ts`
4. `supabase/functions/generate-axes/index.ts`
5. `supabase/functions/backfill-pepites/index.ts`
6. `supabase/functions/suggest-icon/index.ts`
7. `supabase/functions/invite-member/index.ts`
8. `supabase/functions/verify-invite-token/index.ts`

### What is NOT touched

- Authentication logic
- Business logic
- Frontend code
- Any other configuration

### Risk

Low. The only behavioral change is rejecting cross-origin requests from unlisted domains. All app traffic comes from the two allowed origins. Preview URLs (`id-preview--*.lovable.app`) will be blocked — this is acceptable since they share the same Supabase session and the functions validate auth via Bearer token regardless.

