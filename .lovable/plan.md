

## Plan: Add description field to generate-axes prompt and output

### Single file to modify
`supabase/functions/generate-axes/index.ts`

### Changes

**1. Update the prompt (lines 41-60)**

After the label rules block (line 46), insert the description rules:

```
Pour chaque axe, génère aussi une description de 1 à 2 phrases.
- Elle doit être écrite dans les mots du parent, pas en jargon médical
- Elle doit ancrer l'axe dans le quotidien réel décrit dans ses réponses
- Elle doit être spécifique à cet axe — pas une reformulation générale
- Elle peut commencer par 'Tu travailles...', 'C'est le fil rouge de...', 'Au quotidien...' ou toute formulation naturelle
- Jamais de pronostic, jamais de comparaison, jamais de jugement
```

Update the expected JSON template (lines 55-60) to include `"description": "string"` in each axe object.

**2. Increase max_tokens (line 74)**

Change from `1000` to `1500` to accommodate the additional description text.

**3. No other changes needed**

The function already returns `parsed.axes` as-is (line 121), so description will be included in the response automatically. The `CarteProgressionOnboarding` component will receive it and can persist it — but per instructions, the frontend is not touched here.

