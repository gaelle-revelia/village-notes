

## Remplacement de `window.location.origin` par l'URL publiee

### Contexte

Dans `VillageSettings.tsx`, le `redirect_url` envoye a la fonction `invite-member` utilise `window.location.origin`, ce qui en preview pointe vers l'URL de preview au lieu de l'URL publiee. Il faut hardcoder l'URL publiee.

### Modifications

**Fichier : `src/pages/VillageSettings.tsx`**

Deux remplacements identiques :

- **Ligne 184** : `redirect_url: window.location.origin` devient `redirect_url: "https://thevillage-app.lovable.app/onboarding-invite"`
- **Ligne 541** : `redirect_url: window.location.origin` devient `redirect_url: "https://thevillage-app.lovable.app/onboarding-invite"`

Aucun autre fichier modifie.

