

# Migration Supabase -- Synthese Magique

## Issues found in the proposed SQL

1. **`enfant_membres` has `user_id`, not `membre_id`** -- the RLS policy references a non-existent column.
2. **`syntheses.membre_id` references `auth.users(id)`** -- project rules prohibit FK to `auth.users`. Will use `user_id uuid NOT NULL` without FK instead.
3. **CHECK constraints** (`cas_usage`, `mdph_type_demande`) -- per project guidelines, CHECK constraints cause restoration failures. Will use **validation triggers** instead.

## Corrected migration (3 operations)

### 1. Create table `syntheses`

```sql
CREATE TABLE public.syntheses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enfant_id             uuid NOT NULL REFERENCES enfants(id) ON DELETE CASCADE,
  user_id               uuid NOT NULL,
  cas_usage             text NOT NULL,
  periode_debut         date,
  periode_fin           date,
  contenu               text,
  etat_emotionnel       text,
  vocal_mdph            text,
  reponses_transmission jsonb,
  metadata              jsonb,
  created_at            timestamptz DEFAULT now()
);
```

Plus a validation trigger for `cas_usage`:

```sql
CREATE OR REPLACE FUNCTION public.validate_synthese_cas_usage()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.cas_usage NOT IN ('pick_me_up','mdph','rdv_briefing','rdv_presentation','transmission') THEN
    RAISE EXCEPTION 'Invalid cas_usage: %', NEW.cas_usage;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_synthese_cas_usage
  BEFORE INSERT OR UPDATE ON public.syntheses
  FOR EACH ROW EXECUTE FUNCTION public.validate_synthese_cas_usage();
```

### 2. RLS on `syntheses`

```sql
ALTER TABLE public.syntheses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "syntheses_access" ON public.syntheses
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM enfant_membres
      WHERE enfant_membres.enfant_id = syntheses.enfant_id
        AND enfant_membres.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM enfant_membres
      WHERE enfant_membres.enfant_id = syntheses.enfant_id
        AND enfant_membres.user_id = auth.uid()
    )
  );
```

### 3. Add columns to `enfants`

```sql
ALTER TABLE public.enfants
  ADD COLUMN IF NOT EXISTS mdph_type_demande text,
  ADD COLUMN IF NOT EXISTS mdph_derniere_demande date;
```

Plus a validation trigger for `mdph_type_demande`:

```sql
CREATE OR REPLACE FUNCTION public.validate_enfant_mdph_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.mdph_type_demande IS NOT NULL
     AND NEW.mdph_type_demande NOT IN ('premiere_demande','renouvellement') THEN
    RAISE EXCEPTION 'Invalid mdph_type_demande: %', NEW.mdph_type_demande;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_enfant_mdph_type
  BEFORE INSERT OR UPDATE ON public.enfants
  FOR EACH ROW EXECUTE FUNCTION public.validate_enfant_mdph_type();
```

## Summary of corrections vs. original request

| Original | Corrected | Reason |
|---|---|---|
| `membre_id uuid REFERENCES auth.users(id)` | `user_id uuid NOT NULL` (no FK) | No FK to auth.users per project rules |
| `enfant_membres.membre_id` in RLS | `enfant_membres.user_id` | Actual column name |
| `CHECK (cas_usage IN (...))` | Validation trigger | CHECK must be immutable; triggers safer |
| `CHECK (mdph_type_demande IN (...))` | Validation trigger | Same reason |
| Missing `WITH CHECK` on RLS | Added | Required for INSERT/UPDATE |

No React components, edge functions, or other tables will be touched.

