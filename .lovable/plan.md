

## Plan : Ajouter le mode `answer_reformulation` (Option A)

### Résumé
Ajouter un mode `answer_reformulation` dans l'Edge Function `process-memo` qui transcrit l'audio puis reformule la réponse en texte clair (1-3 phrases). Modifier le hook `useVocalRecording` pour accepter un mode paramétrable et adapter `OutilsQuestions.tsx` pour utiliser ce nouveau mode.

### Fichiers modifiés (3)

**1. `supabase/functions/process-memo/index.ts`**
- Ajouter une constante `ANSWER_REFORMULATION_PROMPT` avec le prompt fourni
- Ajouter une fonction `reformulateAnswerFromTranscription(apiKey, transcription)` — même structure que `reformulateQuestionFromTranscription` mais retourne du texte brut (pas de JSON parsing), juste `content.trim()`
- Dans le handler (ligne 297), ajouter `"answer_reformulation"` à la condition existante → après transcription, appeler la nouvelle fonction et retourner `{ answer: string }`

**2. `src/hooks/useVocalRecording.ts`**
- Accepter un paramètre optionnel `mode` (défaut: `"transcription_only"`)
- Passer ce `mode` dans le body de `supabase.functions.invoke("process-memo", { body: { mode, audio_path } })`
- Lire `data.answer || data.transcription` pour le résultat retourné

**3. `src/pages/OutilsQuestions.tsx`**
- Passer `"answer_reformulation"` au hook : `useVocalRecording("answer_reformulation")`
- Aucun autre changement nécessaire — le texte retourné par `stopAnswerRecording()` sera déjà reformulé

### Détail technique — Edge Function

```text
Nouvelle fonction (~25 lignes) :
reformulateAnswerFromTranscription(apiKey, transcription)
  → fetch AI_GATEWAY_URL avec prompt texte brut
  → if !ok: handle 429/402/500
  → return choices[0].message.content.trim()

Handler branching (ligne 297) :
  if (mode === "transcription_only" || mode === "question_reformulation" || mode === "answer_reformulation")
    → transcription = transcribeTempAudio(...)
    → if "transcription_only": return { transcription }
    → if "question_reformulation": return reformulateQuestion(...)
    → if "answer_reformulation": return { answer: reformulateAnswer(...) }
```

### Détail technique — Hook

```text
export function useVocalRecording(mode = "transcription_only")
  → invoke body: { mode, audio_path }
  → resolve(data?.answer || data?.transcription || "")
```

