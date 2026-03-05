

## Plan: Create `generate-synthesis` Edge Function + Frontend Integration

### Critical Issues in Provided Code

The user-provided implementation has several bugs that must be fixed:

1. **Wrong AI endpoint**: Uses `api.anthropic.com` instead of the Lovable AI Gateway (`https://ai.gateway.lovable.dev/v1/chat/completions`). Must also use `LOVABLE_API_KEY` and OpenAI-compatible format.
2. **Wrong column names**:
   - `enfant_membres.membre_id` → should be `enfant_membres.user_id`
   - `enfants.diagnostic` → should be `enfants.diagnostic_label`
   - `intervenants.frequence` → column doesn't exist, remove it
   - `syntheses.membre_id` → should be `syntheses.user_id`
3. **Missing required field**: `memos.insert` is missing `user_id` (NOT NULL column)
4. **CORS headers incomplete**: Missing `x-supabase-client-platform` headers

### Changes

**1. Update `supabase/config.toml`** — Add `generate-synthesis` function entry with `verify_jwt = false`

**2. Create `supabase/functions/generate-synthesis/index.ts`** — Full implementation with fixes:
- Use Lovable AI Gateway with `LOVABLE_API_KEY`
- OpenAI-compatible request format (`messages` array, `model` field at top level)
- Fix all column name references
- Handle 429/402 errors from AI gateway
- Three prompt branches: `pick_me_up`, `mdph`, `transmission` (using the user's prompts verbatim)
- Double-write to `syntheses` + `memos` tables
- Return `{ blocks, synthese_id }`

**3. Update `src/pages/OutilsSynthesePickMeUp.tsx`**:
- Import `useEnfantId`
- Add `isGenerating` + `generatedBlocks` state
- On "Analyser →" tap: call `generate-synthesis` via `supabase.functions.invoke` with `type: "pick_me_up"`, show loading, replace mocked content with AI response
- Handle errors with toast

**4. Update `src/pages/OutilsSyntheseMdph.tsx`**:
- Add `isGenerating` + `generatedBlocks` state
- On "Générer le dossier →" tap: call with `type: "mdph"`, show loading
- Replace mocked `ThematicBlock` content with AI response (title, icon, badge, content)

**5. Update `src/pages/OutilsSyntheseTransmission.tsx`**:
- Import `useEnfantId`
- Add `isGenerating` + `generatedBlocks` state
- On "Générer le livret complet →" tap: call with `type: "transmission"`, `parent_context: { destinataire, reponses }`, show loading
- Replace mocked `ResultCard` content with AI response

### Loading/Error Pattern (all 3 pages)
- CTA label changes to "Génération en cours..." with opacity pulse animation
- Button disabled during generation
- On error: toast "Une erreur est survenue — réessaie." and button returns to normal
- On success: advance to result phase with real blocks

### No changes to
- Database schema, RLS policies
- Other edge functions
- Navigation, design tokens
- config.toml entries for other functions

