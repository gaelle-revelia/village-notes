

## Diagnostic : Page Archives bloquée sur "Chargement…"

### Cause racine identifiée

Le problème vient d'une condition de course (race condition) dans le `useEffect` de `Archives.tsx` :

1. Le composant initialise `loading = true` (ligne 76)
2. `useEnfantId()` retourne `enfantId = null` pendant qu'il charge (le hook est asynchrone)
3. Le `useEffect` (ligne 80) fait `if (!enfantId) return;` — il sort **sans jamais passer `loading` à `false`**
4. Quand `enfantId` se résout, l'effet devrait se relancer... mais si `useAuth` ou `useEnfantId` ont un timing particulier (double render, re-mount), le composant peut rester bloqué sur `loading = true`

De plus, la requête Supabase sur `syntheses` n'a **aucune gestion d'erreur** : si la requête échoue (RLS, réseau), `setLoading(false)` n'est jamais appelé.

### Plan de correction

**Fichier unique modifié** : `src/pages/Archives.tsx`

1. **Utiliser le `loading` du hook `useEnfantId`** — Destructurer `{ enfantId, loading: loadingEnfant }` au lieu de `{ enfantId }` seul

2. **Gérer le cas enfantId null après chargement** — Si le hook a fini de charger mais `enfantId` est null, passer `loading` à `false` immédiatement (l'utilisateur verra "Aucune synthèse")

3. **Ajouter un try/catch** autour de `fetchData` pour que `setLoading(false)` soit toujours appelé, même en cas d'erreur réseau ou RLS

4. **Afficher le vrai état de chargement** — Conditionner le "Chargement…" sur `loading || loadingEnfant`

### Détail technique

```typescript
// Avant
const { enfantId } = useEnfantId();
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (!enfantId) return; // ← BUG: loading reste true si enfantId est null
  const fetchData = async () => { ... };
  fetchData();
}, [enfantId]);

// Après
const { enfantId, loading: loadingEnfant } = useEnfantId();
const [loading, setLoading] = useState(true);

useEffect(() => {
  if (loadingEnfant) return; // attendre que le hook ait fini
  if (!enfantId) {
    setLoading(false); // ← FIX: pas d'enfant = pas de données
    return;
  }
  const fetchData = async () => {
    try {
      setLoading(true);
      // ... requête syntheses + profiles (inchangé)
    } catch (e) {
      console.error("Erreur chargement archives:", e);
    } finally {
      setLoading(false); // ← toujours exécuté
    }
  };
  fetchData();
}, [enfantId, loadingEnfant]);
```

Aucun autre fichier modifié.

