

# Plan finalisé — Code d'accès partenaire

## Précisions intégrées

- **Uppercase** : `code.trim().toUpperCase()` côté client avant envoi. Secret reste en majuscules. Comparaison serveur stricte inchangée.
- **Ordre d'exécution** : `add_secret("ACCESS_CODE_PARTNERS", "VILLAGE-ILDYS-26")` AVANT déploiement de l'edge function.

## Ordre d'exécution

1. **`add_secret`** → `ACCESS_CODE_PARTNERS = "VILLAGE-ILDYS-26"` (bloquant — attendre confirmation utilisateur)
2. Création `supabase/functions/verify-access-code/index.ts`
3. Mise à jour `supabase/config.toml` (bloc `[functions.verify-access-code]` avec `verify_jwt = false`)
4. Déploiement automatique de l'edge function
5. Création `src/pages/CodeAcces.tsx`
6. Modification `src/App.tsx` (route `/code-acces`)
7. Modification `src/pages/Waitlist.tsx` (lien discret sous formulaire)
8. Modification `src/pages/Auth.tsx` (useEffect détection flag + câblage `<SignupForm>`)
9. Modification `src/components/auth/SignupForm.tsx` (suppression flag avant `navigate("/onboarding")`)

## Fichiers (5 modifs + 1 nouveau + 1 secret)

| # | Fichier | Nature |
|---|---|---|
| 1 | `supabase/functions/verify-access-code/index.ts` | **Nouveau** |
| 2 | `supabase/config.toml` | Ajout `[functions.verify-access-code]` |
| 3 | `src/pages/CodeAcces.tsx` | **Nouveau** |
| 4 | `src/App.tsx` | Import + route `/code-acces` |
| 5 | `src/pages/Waitlist.tsx` | Lien discret sous formulaire (uniquement si `!submitted`) |
| 6 | `src/pages/Auth.tsx` | useEffect détection flag + câblage `<SignupForm>` |
| 7 | `src/components/auth/SignupForm.tsx` | `sessionStorage.removeItem("access_code_valid")` avant navigation |
| — | Secret runtime | `ACCESS_CODE_PARTNERS = "VILLAGE-ILDYS-26"` via `add_secret` |

## 1. Edge function `verify-access-code/index.ts`

```text
- Helper getCorsHeaders(req) identique à verify-invite-token (allowlist: the-village.app + thevillage-app.lovable.app)
- Deno.serve(async req => {
    - OPTIONS → 200 avec corsHeaders
    - method !== POST → 405 { error: "Method not allowed" }
    - try parse body { code: string }
    - !code ou typeof !== "string" → 400 { error: "Code requis" }
    - submitted = code.trim()  (préserve la casse — l'uppercase est déjà fait côté client)
    - expected = Deno.env.get("ACCESS_CODE_PARTNERS")
    - !expected → 500 + console.error("ACCESS_CODE_PARTNERS not set"), pas de log du code soumis
    - valid = submitted === expected
    - return 200 { valid: boolean }
    - catch → 500 { error: "Internal server error" }
  })
```

**verify_jwt = false** dans `config.toml` (route pré-auth).
**Pas de log du code soumis** (principe de minimisation).

## 2. `supabase/config.toml`

Ajout :
```toml
[functions.verify-access-code]
verify_jwt = false
```

## 3. `src/pages/CodeAcces.tsx`

Layout glassmorphism identique à `Auth.tsx` (rgba 0.52, blur 16px saturate 1.6).

```text
<main min-h-screen flex items-center justify-center px-4 py-8>
  <div max-w-[400px] glassmorphism>
    <div text-center space-y-2 mb-6>
      <h1 font-serif text-[28px] font-semibold>Accès partenaire</h1>
      <p text-sm text-muted-foreground>
        Saisissez le code qui vous a été communiqué pour accéder à l'inscription.
      </p>
    </div>

    <form onSubmit={handleSubmit} space-y-4>
      <Input
        autoFocus
        type="text"
        placeholder="Votre code d'accès"
        value={code}
        onChange={e => setCode(e.target.value)}
        className="rounded-lg text-center tracking-wider"
      />
      {error && <p text-sm text-center style={{color:"#E8736A"}}>{error}</p>}

      <Button type="submit" disabled={loading || !code.trim()}
              className="w-full rounded-xl h-12 text-base"
              style={{background:"linear-gradient(135deg, #E8736A, #8B74E0)", color:"white"}}>
        {loading ? "Vérification..." : "Valider"}
      </Button>
    </form>

    <p text-center text-sm mt-6>
      <a href="/waitlist" className="text-muted-foreground hover:underline">
        Retour à la liste d'attente
      </a>
    </p>
  </div>
</main>

handleSubmit:
  e.preventDefault()
  setError(""); setLoading(true)
  try {
    const codeToSend = code.trim().toUpperCase()   // ← variante tolérante
    const { data, error } = await supabase.functions.invoke("verify-access-code", {
      body: { code: codeToSend }
    })
    if (error) throw error
    if (data?.valid === true) {
      sessionStorage.setItem("access_code_valid", "true")
      navigate("/auth")
    } else {
      setError("Ce code ne semble pas valide")
    }
  } catch {
    setError("Une erreur est survenue. Veuillez réessayer.")
  } finally {
    setLoading(false)
  }
```

## 4. `src/App.tsx`

```tsx
import CodeAcces from "./pages/CodeAcces";
// ...
<Route path="/code-acces" element={<CodeAcces />} />
```

Position : juste après `<Route path="/waitlist" ... />`.

## 5. `src/pages/Waitlist.tsx`

Dans la branche `!submitted`, à la fin du `<form>` (juste avant `</form>`, après le `<p>` "Pas de spam") :

```tsx
<div style={{ textAlign: "center", marginTop: 16 }}>
  <a href="/code-acces"
     style={{ fontSize: 13, color: "#8B74E0", textDecoration: "underline", opacity: 0.85 }}>
    Vous avez reçu un code d'accès ?
  </a>
</div>
```

✅ Visible uniquement avant soumission. Pas affiché dans le message de confirmation.

## 6. `src/pages/Auth.tsx`

**Imports** : ajouter `import { SignupForm } from "@/components/auth/SignupForm";`

**Nouveau useEffect** (après le useEffect existant ligne 27) :
```tsx
useEffect(() => {
  const accessCodeValid = sessionStorage.getItem("access_code_valid");
  if (accessCodeValid === "true") {
    setView("signup");
  }
}, []);
```

**Ajout rendu signup** (entre les blocs login et forgot-password) :
```tsx
{view === "signup" && (
  <SignupForm
    onSwitchToLogin={() => setView("login")}
    onSuccess={handleSignupSuccess}
  />
)}
```

**Comportement défensif** : `onSwitchToSignup={() => navigate("/waitlist")}` conservé (jamais atteignable si flag actif puisque useEffect bascule auto).

## 7. `src/components/auth/SignupForm.tsx`

**Ajout unique** : juste avant `navigate("/onboarding")` (ligne 80) :
```ts
sessionStorage.removeItem("access_code_valid");
navigate("/onboarding");
```

Une seule ligne. Pas de modif de logique signup.

## Wording final

| Élément | Texte |
|---|---|
| Titre page CodeAcces | "Accès partenaire" |
| Sous-titre | "Saisissez le code qui vous a été communiqué pour accéder à l'inscription." |
| Placeholder | "Votre code d'accès" |
| Bouton | "Valider" / "Vérification..." |
| Erreur code invalide | "Ce code ne semble pas valide" |
| Erreur réseau | "Une erreur est survenue. Veuillez réessayer." |
| Lien retour CodeAcces | "Retour à la liste d'attente" |
| Lien Waitlist → CodeAcces | "Vous avez reçu un code d'accès ?" |

## Garanties

- ✅ Aucune table BDD créée, aucune migration, aucune RLS modifiée
- ✅ Aucune dépendance npm ajoutée
- ✅ Pas de log du code soumis (PII minimisation)
- ✅ CORS restreint aux 2 domaines The Village (pattern verify-invite-token)
- ✅ `verify_jwt = false` (route pré-auth)
- ✅ Comptes créés = owner standard, indistinguables (aucune colonne ajoutée)
- ✅ Règle 31 (signup bloqué par défaut) respectée : Waitlist reste l'entrée principale, CodeAcces est un détour discret
- ✅ Règle 24 (pas d'IA dans l'UI) : aucune IA dans cette feature
- ✅ Uppercase tolérant côté client : `VILLAGE-ILDYS-26`, `village-ildys-26`, `Village-Ildys-26` → tous valides
- ✅ Secret configuré AVANT déploiement edge function (premier test fonctionnel)

## Cas limites

- ✅ Refresh sur `/auth` après code valide → useEffect rebascule en signup tant que flag présent
- ✅ Signup réussi → flag supprimé → refresh ramène en login
- ✅ Fermeture onglet → flag perdu (sessionStorage) → demande à refaire le code
- ✅ Code soumis avec espaces → `.trim()` côté client + serveur
- ✅ Code en minuscules → `.toUpperCase()` côté client → match
- ✅ Edge function sans secret → 500 explicite serveur, message générique côté client
- ✅ Erreur réseau → message générique, pas de retry custom

