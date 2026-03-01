

# Ajout de la politique RLS `membres_select_enfants`

## Objectif

Permettre aux membres du Village (table `enfant_membres`) de lire les informations d'un enfant, meme s'ils ne sont pas le createur (`user_id`). Cela est necessaire pour que les utilisateurs invites puissent voir le prenom de l'enfant dans l'onboarding et la timeline.

## Contexte

Actuellement, la table `enfants` n'a qu'une seule politique RLS (`users_own_enfants`) qui restreint l'acces au createur (`user_id = auth.uid()`). Les membres invites, bien que lies via `enfant_membres`, ne peuvent pas lire les donnees de l'enfant.

## Migration SQL

```sql
CREATE POLICY "membres_select_enfants"
ON public.enfants
FOR SELECT
TO authenticated
USING (get_membre_role(id) IS NOT NULL);
```

Cette politique utilise la fonction existante `get_membre_role(eid)` qui verifie si l'utilisateur connecte est membre du Village pour cet enfant. Elle s'ajoute a la politique existante `users_own_enfants` — les deux fonctionnent en OR (politiques permissives par defaut... mais ici les deux sont restrictives/`RESTRICTIVE`).

## Point d'attention

Les politiques existantes sur `enfants` utilisent `PERMISSIVE: No` (donc RESTRICTIVE). La nouvelle politique doit etre **permissive** (par defaut) pour fonctionner en OR avec la politique existante. Sinon, les deux seraient evaluees en AND et aucun invite ne pourrait acceder aux donnees.

Il faut donc soit :
- Creer cette nouvelle politique en mode PERMISSIVE (defaut, pas besoin de preciser)
- Soit convertir `users_own_enfants` en PERMISSIVE egalement

Puisque `users_own_enfants` est RESTRICTIVE, ajouter une politique PERMISSIVE ne suffira pas — les restrictives s'appliquent en AND apres les permissives. La bonne approche est de **remplacer** la politique existante par deux politiques PERMISSIVE :

```sql
-- Supprimer l'ancienne politique restrictive
DROP POLICY "users_own_enfants" ON public.enfants;

-- Politique 1 : le proprietaire peut tout faire
CREATE POLICY "owner_all_enfants"
ON public.enfants
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Politique 2 : les membres peuvent lire
CREATE POLICY "membres_select_enfants"
ON public.enfants
FOR SELECT
TO authenticated
USING (get_membre_role(id) IS NOT NULL);
```

## Fichiers impactes

Aucun fichier code a modifier. Migration SQL uniquement.

