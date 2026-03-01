

# Corriger l'affichage et l'ouverture des documents dans la timeline

## Probleme

Un memo de type `document` est cree dans `NouveauDocument.tsx` avec `processing_status: "pending"`, mais aucun traitement IA n'est declenche ensuite (contrairement aux vocaux et notes). Le statut reste bloque a `"pending"`, ce qui cause :
- Un spinner permanent sur la card ("Traitement en cours...")
- L'impossibilite de cliquer pour ouvrir le memo

## Solution

Les documents n'ont pas besoin de traitement IA (pas de transcription, pas de structuration). Deux corrections sont necessaires :

### 1. NouveauDocument.tsx -- creer le document avec `processing_status: "done"`

Modifier la ligne d'insertion pour utiliser `processing_status: "done"` au lieu de `"pending"`, car il n'y a pas d'etape de traitement a attendre.

### 2. MemoCard.tsx -- permettre l'ouverture des documents meme en `pending`

Modifier `handleClick` pour autoriser la navigation vers le detail pour les documents quel que soit leur statut :

```typescript
const handleClick = () => {
  if (memo.processing_status === "done" || memoType === "document") {
    navigate(`/memo-result/${memo.id}`);
  }
};
```

Et ajuster `isProcessing` pour ne pas afficher le spinner sur les documents :

```typescript
const isProcessing = memoType !== "document" && memo.processing_status !== "done" && memo.processing_status !== "error";
```

### 3. Corriger le document existant en base

Mettre a jour le memo document existant (id `3c07e43b`) pour passer son `processing_status` de `"pending"` a `"done"`.

## Detail technique

| Fichier | Modification |
|---|---|
| `src/pages/NouveauDocument.tsx` | `processing_status: "done"` au lieu de `"pending"` |
| `src/components/memo/MemoCard.tsx` | Exclure les documents du test `isProcessing` + autoriser le clic |
| Migration SQL | `UPDATE memos SET processing_status = 'done' WHERE type = 'document' AND processing_status = 'pending'` |

