

## Persistance du hash d'invitation entre Auth et OnboardingInvite

### Probleme

Quand un utilisateur invite clique sur le lien email, Supabase redirige vers `/auth#access_token=...&type=invite...`. Le composant Auth ne preserve pas ce hash -- si la session est traitee et l'utilisateur redirige, le hash est perdu. OnboardingInvite a besoin de ce hash pour que Supabase initialise correctement la session invitee.

### Modifications

**Fichier 1 : `src/pages/Auth.tsx`**

Ajouter un `useEffect` au montage (avant le rendu conditionnel) qui :
1. Lit `window.location.hash`
2. Parse les parametres du hash (`URLSearchParams`)
3. Si `type` vaut `invite` ou `signup` :
   - Stocke le hash complet dans `localStorage.setItem("invite_hash", window.location.hash)`
   - Redirige immediatement vers `/onboarding-invite` avec le hash (`navigate("/onboarding-invite" + window.location.hash, { replace: true })`)

Imports a ajouter : `useEffect` (deja present via useState), `useNavigate` depuis `react-router-dom`.

Le useEffect s'execute avant le check `if (user)` car il est dans le corps du composant, executant la redirection des le montage si le hash est detecte.

**Fichier 2 : `src/pages/OnboardingInvite.tsx`**

Ajouter un `useEffect` au montage (avant le chargement des donnees) qui :
1. Verifie si `window.location.hash` contient `access_token`
2. Si non, verifie si `localStorage.getItem("invite_hash")` existe
3. Si oui, reapplique le hash sur l'URL : `window.location.replace(window.location.pathname + storedHash)`
   - Cela permet a Supabase de detecter et traiter le token
   - `window.location.replace` recharge la page avec le hash, ce qui declenche le parsing par le client Supabase

Ce useEffect doit etre place en premier dans le composant (avant les autres useEffect) pour s'executer avant que Supabase tente de lire la session.

### Details techniques

```text
Flux complet :
Email invite → /auth#access_token=...&type=invite
  └─ Auth.tsx useEffect detecte type=invite
     ├─ localStorage.setItem("invite_hash", hash)
     └─ navigate("/onboarding-invite#access_token=...&type=invite")
        └─ OnboardingInvite monte
           └─ Supabase client parse le hash → session creee

Flux fallback (hash perdu pendant redirect) :
OnboardingInvite monte sans hash
  └─ useEffect detecte absence de hash dans URL
     └─ localStorage.getItem("invite_hash") existe
        └─ window.location.replace(pathname + storedHash)
           └─ Page recharge → Supabase parse le hash
```

Aucun autre fichier modifie.
