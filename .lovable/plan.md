

# Pipeline de structuration avec lexique contextuel + migration a_retenir

## ✅ COMPLÉTÉ

### 1. `supabase/functions/process-memo/index.ts`
- Fetch `enfant_lexique` + formatage variantes → mot_correct
- Nouveau system prompt (règles absolues, prénom, contexte, lexique contextuel)
- Tool params: `resume` (5-8 mots), `details` (max 5), `a_retenir` (max 3), `tags` (max 4), `intervenant_detected` (nullable)

### 2. `src/pages/MemoResult.tsx`
- Interface: ajout `a_retenir?: string[]`
- Lecture: `structured?.a_retenir || structured?.suggestions || []`
- Écriture: `saveSuggestions` écrit `a_retenir` et `delete updatedStructured.suggestions`
- `startEditSuggestions`: lit `a_retenir || suggestions`

### 3. `src/components/memo/MemoResultView.tsx`
- Interface: ajout `a_retenir?: string[]`
- Rendu: `structured.a_retenir || structured.suggestions`

### 4. `src/pages/RecordMemo.tsx`
- Interface: ajout `a_retenir?: string[]`
