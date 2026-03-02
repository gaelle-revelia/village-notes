

# Lexique partagé — Table + Edge Function

## Objectif
Creer l'infrastructure backend pour le systeme de lexique partage : une table `enfant_lexique` pour stocker les correspondances phonetiques, et une edge function `generate-lexique` qui utilise l'IA pour generer ces variantes.

---

## PART A — Migration SQL

Creer la table `enfant_lexique` avec :
- `id` (uuid, PK)
- `enfant_id` (uuid, FK vers enfants, ON DELETE CASCADE)
- `mot_transcrit` (text, NOT NULL)
- `mot_correct` (text, NOT NULL)
- `created_at` (timestamptz, default now())

Activer RLS et ajouter 4 politiques (SELECT, INSERT, UPDATE, DELETE) basees sur l'appartenance via `enfant_membres`.

Ajouter un index sur `enfant_id`.

## PART B — Edge Function `generate-lexique`

Creer `supabase/functions/generate-lexique/index.ts` :
- CORS headers (meme pattern que `suggest-icon`)
- Auth check via Bearer token
- Appel Lovable AI gateway avec `google/gemini-3-flash-preview`
- System prompt pour generation de variantes phonetiques
- User prompt avec prenom + intervenants injectes
- Parse JSON, retour `{ entries: [...] }`, fallback `{ entries: [] }` si erreur de parse
- Gestion erreurs 429/402

Ajouter `[functions.generate-lexique]` dans `supabase/config.toml` avec `verify_jwt = false`.

---

## Details techniques

### Migration SQL

```sql
CREATE TABLE public.enfant_lexique (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id uuid NOT NULL REFERENCES public.enfants(id) ON DELETE CASCADE,
  mot_transcrit text NOT NULL,
  mot_correct text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_enfant_lexique_enfant_id ON public.enfant_lexique(enfant_id);

ALTER TABLE public.enfant_lexique ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read enfant lexique"
  ON public.enfant_lexique FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can insert enfant lexique"
  ON public.enfant_lexique FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can update enfant lexique"
  ON public.enfant_lexique FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));

CREATE POLICY "members can delete enfant lexique"
  ON public.enfant_lexique FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.enfant_membres
    WHERE enfant_membres.enfant_id = enfant_lexique.enfant_id
    AND enfant_membres.user_id = auth.uid()
  ));
```

### Edge Function `generate-lexique`

Pattern identique a `suggest-icon` :
- CORS headers standard
- Validation du body (`prenom_enfant` requis, `intervenants` tableau)
- Appel AI gateway avec les prompts specifies
- Extraction du contenu, `JSON.parse` avec try/catch
- Retour `{ entries: [] }` en cas d'echec de parsing (pas de throw)
- Gestion 429 (rate limit) et 402 (payment required) avec messages explicites

### Fichiers modifies/crees

| Fichier | Action |
|---|---|
| Migration SQL | Nouvelle migration |
| `supabase/functions/generate-lexique/index.ts` | Creation |
| `supabase/config.toml` | Ajout section `[functions.generate-lexique]` |

### Ce qui n'est PAS touche
- `process-memo` edge function
- Tables existantes et leurs RLS
- Logique d'authentification

