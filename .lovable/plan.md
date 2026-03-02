

# Pipeline de structuration avec lexique contextuel + migration a_retenir

## 1. `supabase/functions/process-memo/index.ts`

### A. Ajout fetch lexique (apres le fetch intervenant, avant l'appel structuration)
- Requete `enfant_lexique` par `enfant_id`
- Formatage en paires "variantes -> mot_correct" groupees

### B. Nouveau system prompt
- Regles absolues (jamais diagnostic, jamais commentaire editorial)
- Section prenom enfant avec regle stricte d'orthographe
- Contexte enfant + intervenant
- Lexique de correction contextuelle avec instructions de desambiguisation

### C. Parametres tool function mis a jour
- `resume` : titre factuel 5-8 mots
- `details` : maxItems 5, observations factuelles
- `a_retenir` remplace `suggestions` : maxItems 3, nullable
- `tags` : maxItems 4
- `intervenant_detected` : type [string, null]

## 2. `src/pages/MemoResult.tsx`

### Interface
- Ajouter `a_retenir?: string[]` a `StructuredContent`

### Lecture (fallback retrocompatible)
- `const suggestions = structured?.a_retenir || structured?.suggestions || []`

### Ecriture (cleanup migration)
- `saveSuggestions` ecrit dans `a_retenir` et supprime `suggestions` du JSON :
```
const updatedStructured = { ...(memo.content_structured || {}), a_retenir: items };
delete updatedStructured.suggestions;
autoSave({ content_structured: updatedStructured });
```

## 3. `src/components/memo/MemoResultView.tsx`

- Ajouter `a_retenir?: string[]` a l'interface
- Lire `structured.a_retenir || structured.suggestions` pour le rendu

## Fichiers non modifies
- Transcription audio, auth, CORS, audio download/delete, processing_status flow
- generate-lexique, suggest-icon, invite-member
- useAuth, BottomNavBar, StepEnfant

