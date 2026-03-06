

## Plan: Add pepites detection block to process-memo

### What changes

**File: `supabase/functions/process-memo/index.ts`**

Add a `detectPepites` helper function and call it in two places, both after `processing_status = 'done'` and before returning the response.

**Helper function** (top-level, before `serve`):
- Takes `supabase`, `lovableApiKey`, `memo_id`, `enfant_id`, `resume`
- If no `enfant_id` or no `resume`: return silently
- Query `axes_developpement` where `enfant_id` and `actif = true`
- If no axes: return silently
- Call `google/gemini-2.5-flash` with the specified prompt
- Parse `axe_ids` array, INSERT into `pepites` with ON CONFLICT DO NOTHING
- Entire function wrapped in try/catch — errors logged only

**Call site 1** — text_quick path (after line 350, before the return on line 352):
```typescript
await detectPepites(supabase, lovableApiKey, memo_id, memo.enfant_id, quickStructured.resume);
```

**Call site 2** — main structuration path (after line 484, before the return on line 486):
```typescript
await detectPepites(supabase, lovableApiKey, memo_id, memo.enfant_id, structured?.resume);
```

**Skipped for**: `transcription_only` mode (no memo), `document` type memos (no AI structuration happens for them anyway — they don't reach these code paths).

### What won't be touched
- Transcription logic, auth, CORS, audio download/delete
- processing_status flow
- Existing structuration prompt
- All other edge functions

