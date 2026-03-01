

## Creation des tables "Activites suivies"

Migration SQL unique pour creer les deux tables avec RLS.

### Table `activites`

Stocke les types d'activites suivies pour un enfant (ex: "Marche", "Velo").

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| enfant_id | uuid | NOT NULL, FK enfants(id) ON DELETE CASCADE |
| nom | text | NOT NULL |
| domaine | text | NOT NULL |
| track_temps | boolean | DEFAULT true |
| track_distance | boolean | DEFAULT false |
| unite_distance | text | DEFAULT 'metres' |
| actif | boolean | DEFAULT true |
| created_at | timestamptz | DEFAULT now() |

### Table `sessions_activite`

Stocke chaque session enregistree pour une activite.

| Colonne | Type | Contraintes |
|---|---|---|
| id | uuid | PK, gen_random_uuid() |
| activite_id | uuid | NOT NULL, FK activites(id) ON DELETE CASCADE |
| enfant_id | uuid | NOT NULL, FK enfants(id) ON DELETE CASCADE |
| duree_secondes | integer | nullable |
| distance | numeric | nullable |
| notes | text | nullable |
| created_at | timestamptz | DEFAULT now() |

### RLS (4 policies par table)

Les deux tables utilisent le meme pattern que `intervenants` et `memos` :

- **SELECT** : `get_membre_role(enfant_id) IS NOT NULL`
- **INSERT** : `get_membre_role(enfant_id) IN ('owner', 'coparent')`
- **UPDATE** : `get_membre_role(enfant_id) IN ('owner', 'coparent')`
- **DELETE** : `get_membre_role(enfant_id) IN ('owner', 'coparent')`

Le role `famille` aura un acces en lecture seule, coherent avec le controle d'acces existant.

### Details techniques

Une seule migration SQL sera executee contenant :
1. CREATE TABLE activites + ENABLE RLS + 4 policies
2. CREATE TABLE sessions_activite + ENABLE RLS + 4 policies

Aucun composant React, aucune edge function, aucune modification de fichier existant.

