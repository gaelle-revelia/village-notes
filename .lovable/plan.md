

## Plan: Rétablir le formulaire d'inscription sur /auth

### Modification unique

**Fichier**: `src/components/auth/LoginForm.tsx`

Remplacer le lien `<a href="/waitlist">` par un `<button>` qui appelle `onSwitchToSignup` (comme c'était prévu à l'origine).

Ligne ~107 : remplacer le `<a href="/waitlist" ...>Créer mon espace</a>` par `<button onClick={onSwitchToSignup} ...>Créer mon espace</button>`.

Aucun autre fichier modifié.

