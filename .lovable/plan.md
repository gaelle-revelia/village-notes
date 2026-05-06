## Problème

Après un clic sur "Charger plus", la 2e page de mémos est correctement chargée depuis la base (26 mémos, dont les 2 documents de février 2025), mais ils n'apparaissent pas en haut de la timeline. Cause : le regroupement par mois utilise une `Map`, qui préserve l'ordre d'insertion. Comme la nouvelle page est **préfixée** au tableau (`[...mapped, ...prev]`) sans tri global, l'ordre des clés mois devient incohérent et les anciens mois (2024, fév 2025) se retrouvent au milieu de la timeline au lieu d'être tout en haut.

## Correction

Un seul changement dans `src/pages/Timeline.tsx`, dans le `useMemo` `grouped` (juste avant la boucle qui remplit la `Map`) :

Trier `filteredMemos` par date **croissante** avant le groupage. Cela garantit que les clés de mois sont insérées dans la `Map` du plus ancien au plus récent. Le `groups.reverse()` existant peut alors être supprimé (ou conservé en inversant la logique de tri — au choix).

```ts
const grouped = useMemo(() => {
  const groups: { key: string; label: string; memos: Memo[] }[] = [];
  const map = new Map<string, Memo[]>();

  // Tri croissant par date avant groupage : garantit l'ordre des mois
  const sorted = [...filteredMemos].sort((a, b) => {
    const da = new Date(a.memo_date || a.created_at).getTime();
    const db = new Date(b.memo_date || b.created_at).getTime();
    return da - db; // ancien → récent
  });

  for (const memo of sorted) {
    const d = new Date(memo.memo_date || memo.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(memo);
  }

  for (const [key, items] of map) {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m), 1);
    const label = format(d, "MMMM yyyy", { locale: fr }).toUpperCase();
    groups.push({ key, label, memos: items });
  }

  // Plus besoin de groups.reverse() ni de g.memos.reverse() :
  // déjà dans l'ordre ancien → récent (top → bottom)

  return groups;
}, [filteredMemos]);
```

## Effet attendu

- Avant : "le plus ancien visible" = 16 mai 2025 (faussement, car les anciens étaient au milieu).
- Après : en scrollant vers le haut, l'utilisateur voit successivement avr 2025 → mar 2025 → **fév 2025 (avec les 2 documents)** → oct 2024 → sept 2024 → mai 2024.
- L'ordre interne (le plus récent en bas de la timeline globale) est conservé.

## Fichiers touchés

- `src/pages/Timeline.tsx` — uniquement le `useMemo grouped`.

## Risques

Très faible. Modification purement présentationnelle, isolée à un `useMemo`. Le comportement initial (page 1 seule) reste identique car les mémos arrivent déjà triés par la requête SQL.
