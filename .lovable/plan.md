

# Logs client structurés autour de `process-memo` — Plan d'exécution

## Fichiers modifiés

1. `src/hooks/useVocalRecording.ts`
2. `src/hooks/useAudioRecorder.ts`
3. `src/pages/NouveauMemoVocal.tsx`

## Modifications

### 1. `src/hooks/useVocalRecording.ts`

- Déclarer `let audioPath = ""` juste avant le `try` pour qu'il soit accessible dans le `catch`.
- **Avant** `supabase.functions.invoke("process-memo", ...)` : ajouter `console.info("[vocal-recording] invoke process-memo", { hook, mode, mimeType, blobSizeBytes, durationMs, audioPath, timestamp })`.
- **Après** retour OK (avant `setIsTranscribing(false)`) : ajouter `console.info("[vocal-recording] process-memo success", { hook, mode, durationMs, timestamp })`.
- **Dans le `catch`** : ajouter `console.error("[vocal-recording] process-memo failed", { hook, mode, mimeType, blobSizeBytes, audioPath, errorMessage, errorStatus, errorBody, timestamp })` **avant** le `console.error("Vocal recording error:", err)` existant (qui reste en place).

### 2. `src/hooks/useAudioRecorder.ts`

- **Après** `setAudioBlob(blob)` dans `recorder.onstop` : ajouter `console.info("[vocal-recording] recording stopped, blob ready", { hook: "useAudioRecorder", mimeType, blobSizeBytes, timestamp })`. `durationMs` omis (pas de nouveau ref).

### 3. `src/pages/NouveauMemoVocal.tsx`

Dans `processMemo`, autour de l'`invoke` :

- **Avant** `supabase.functions.invoke("process-memo", ...)` : ajouter `console.info("[vocal-recording] invoke process-memo", { hook: "NouveauMemoVocal", mode, mimeType, blobSizeBytes, audioPath, timestamp })`.
- **Après** vérifications OK (avant `setProcessingStatus("structuring")`) : ajouter `console.info("[vocal-recording] process-memo success", { hook: "NouveauMemoVocal", mode, timestamp })`.
- **Dans le `catch (err)`** : ajouter `console.error("[vocal-recording] process-memo failed", { hook, mode, mimeType, blobSizeBytes, errorMessage, errorStatus, errorBody, timestamp })` **avant** le `console.error("Process memo error:", err)` existant (qui reste en place).

## Garanties

- Aucune modification de logique métier, `try/catch`, `setError`, `resolve()`, ou appels Supabase.
- Aucun nouveau `useState`, `useEffect`, `useRef`, ou dépendance npm.
- Aucune signature de hook modifiée.
- Aucune PII loggée (pas de `user_id`, `memo_id`, `child_id`, transcription, audio).
- Préfixe uniforme `[vocal-recording]`.
- `console.error` existants conservés.
- Seuil 10 s et fallback mimeType non touchés.

