
# Corriger l'ouverture des fichiers documents

## Probleme identifie

L'URL signee est correctement generee (la requete POST retourne un status 200 avec un token valide). Le fichier PDF existe bien dans le stockage. Le probleme vient probablement de l'une de ces deux causes :

1. **Iframe sandbox** : Le bouton "Ouvrir le fichier" utilise `target="_blank"` qui peut etre bloque par la sandbox de l'iframe de preview Lovable. Ce n'est pas un bug du code mais une limitation de l'environnement de preview.

2. **URL signee mal construite** : Verifier que le SDK Supabase retourne bien une URL absolue et non un chemin relatif. La reponse brute montre un `signedURL` relatif (`/object/sign/voice-memos/...`), mais le SDK devrait normalement le prefixer avec l'URL du projet.

## Solution proposee

Pour contourner le blocage potentiel de `target="_blank"` dans l'iframe et rendre l'experience plus fiable :

### 1. Utiliser `window.open()` au lieu de `<a target="_blank">`

Remplacer le lien `<a href={signedFileUrl} target="_blank">` par un `<button>` qui appelle `window.open(signedFileUrl, '_blank')`. Ce pattern fonctionne mieux dans les contextes d'iframe.

### 2. Ajouter un fallback avec `download` via fetch + Blob

Si `window.open` est aussi bloque, proposer un telechargement direct en creant un Blob a partir du fichier et en declenchant un download programmatique.

### 3. Ajouter un log de debug temporaire

Ajouter un `console.log` de l'URL signee generee pour verifier qu'elle est bien absolue et valide.

## Detail technique

| Fichier | Modification |
|---|---|
| `src/pages/MemoResult.tsx` | Remplacer le lien `<a>` par un bouton avec `window.open()` + fallback download via Blob |

### Code cible (section FICHIER dans MemoResult.tsx)

Le bouton "Ouvrir le fichier" sera remplace par :

```typescript
<button
  onClick={() => {
    if (signedFileUrl) {
      window.open(signedFileUrl, '_blank', 'noopener,noreferrer');
    }
  }}
  className="flex items-center justify-center gap-2 mt-3 w-full py-2.5 rounded-xl text-sm font-medium cursor-pointer"
  style={{
    fontFamily: "'DM Sans', sans-serif",
    background: "linear-gradient(135deg, #E8736A, #8B74E0)",
    color: "white",
    border: "none",
  }}
>
  <ExternalLink size={14} />
  Ouvrir le fichier
</button>
```

Ce changement est minimal et ne touche que le bouton d'ouverture dans la section FICHIER.
