

# Lot 1 — Résilience réseau : retry auto + CTA manuel (final)

## Vérifications confirmées

- **`NouveauMemoVocal.tsx`** : `upsert: true` confirmé (ligne 147), `storagePath = ${user.id}/${memo.id}.webm`. → **Réutilisation** du même path à chaque retry.
- **`useVocalRecording.ts`** : `upsert: false` avec UUID (`synthesis/${uuid}.webm`). → **Nouveau UUID** à chaque tentative.
- **"Connexion instable"** : strictement réservé aux erreurs réseau. Tous les autres messages (mic indisponible, durée trop courte, transcription vide, quota) sont préservés sur tous les call-sites, modifiés ou non.

## Fichiers (5)

| # | Fichier | Nature |
|---|---|---|
| 1 | `src/lib/network.ts` | **Nouveau** — `isNetworkError` + `retryOnNetworkError` |
| 2 | `src/hooks/useVocalRecording.ts` | Refactor + API étendue |
| 3 | `src/hooks/useAudioRecorder.ts` | Ajout `clearLastBlob()` minimal |
| 4 | `src/pages/NouveauMemoVocal.tsx` | Wrapper retry + écran erreur enrichi |
| 5 | `src/components/synthese/WiredMicOrb.tsx` | Bloc erreur conditionnel + sous-texte |

## 1. `src/lib/network.ts` (nouveau)

```text
isNetworkError(err): boolean
  - err.status numérique >= 400 → false (jamais retry HTTP)
  - err.name === "FunctionsFetchError" → true
  - msg.toLowerCase() contient "failed to fetch" | "networkerror" | "network changed" | "err_network" → true
  - sinon → false

retryOnNetworkError<T>(fn: (attempt: number) => Promise<T>, opts?: { delays?: number[], onRetry?: (attempt, reason) => void }): Promise<T>
  - delays par défaut [500, 2000] → 3 tentatives max
  - try fn(attempt) ; catch err : si !isNetworkError ou dernière → throw ; sinon onRetry + sleep + continue
```

Pas d'import `FunctionsFetchError` — check par `err.name`.

## 2. `src/hooks/useVocalRecording.ts`

**Imports** : `isNetworkError, retryOnNetworkError` depuis `@/lib/network`.

**Nouveaux internes** :
- `lastBlobRef = useRef<{ blob, mimeType, durationMs } | null>(null)`
- `[pendingRetry, setPendingRetry] = useState(false)`
- `[retryAttempt, setRetryAttempt] = useState(0)`

**Refactor** : extraire upload+invoke du `recorder.onstop` en `executeUploadAndInvoke(blob, mimeType, durationMs)` :
- Wrapping `retryOnNetworkError(async (attempt) => { uuid frais ; upload ; invoke ; return result }, { delays: [500, 2000], onRetry: (attempt, reason) => { setRetryAttempt(attempt); console.info("[vocal-recording] retry attempt", { hook: "useVocalRecording", mode, attempt, reason: reason.slice(0, 120), timestamp }) } })`

**Branches d'erreur** dans `onstop` et `retry()` :
- ✅ Succès → `lastBlobRef.current = null`, `setPendingRetry(false)`, `setRetryAttempt(0)`
- ❌ **Réseau** (après tous retries) → `lastBlobRef.current = { blob, mimeType, durationMs }`, `setPendingRetry(true)`, `setError("Connexion instable")`, log existant conservé
- ❌ **Non-réseau** → `lastBlobRef.current = null`, `setPendingRetry(false)`, `setError("Transcription échouée — réessaie ou utilise la saisie texte.")` (message existant inchangé)

**Méthodes exposées** :
```text
retry(): Promise<string|null>
  - if (!lastBlobRef.current || isTranscribing) return null
  - log "manual retry requested"
  - setIsTranscribing(true); setError(null); setRetryAttempt(0)
  - try → executeUploadAndInvoke → succès branche
  - catch → mêmes branches que onstop
  - finally → setIsTranscribing(false)

cancelPendingRetry(): void
  - log "manual retry cancelled"
  - lastBlobRef.current = null ; setPendingRetry(false) ; setError(null) ; setRetryAttempt(0)
```

**Retour étendu** :
```text
{ ...existant, retry, canRetry: pendingRetry && !!lastBlobRef.current, cancelPendingRetry, retryAttempt }
```

✅ Signature `useVocalRecording(mode, childId?, minDuration?)` inchangée. Call-sites non modifiés ignorent les nouveaux champs et bénéficient du retry auto silencieux. Leurs messages d'erreur existants (mic, durée trop courte, métier) sont préservés.

## 3. `src/hooks/useAudioRecorder.ts`

Modif minimale (option ultra-minimale validée) :
- Ajout au retour : `clearLastBlob: () => setAudioBlob(null)` (équivalent partiel à `reset()`).
- Pas de nouveau `useRef`.

## 4. `src/pages/NouveauMemoVocal.tsx`

**Imports** : `WifiOff` (lucide), `isNetworkError, retryOnNetworkError` (`@/lib/network`).

**Nouveaux state** :
- `[lastFailureWasNetwork, setLastFailureWasNetwork] = useState(false)`
- `[retryAttempt, setRetryAttempt] = useState(0)`

**Refactor `processMemo`** :
- Wrapper l'appel `supabase.functions.invoke("process-memo", ...)` via `retryOnNetworkError(..., { delays: [500, 2000], onRetry: (attempt, reason) => { setRetryAttempt(attempt); console.info("[vocal-recording] retry attempt", { hook: "NouveauMemoVocal", mode, attempt, reason, timestamp }) } })`.
- **`storagePath` inchangé** entre tentatives (`upsert: true` confirmé). Pas de nouveau UUID.
- L'`upload` peut aussi être wrappé avec la même stratégie (toujours réutilisation du même path grâce à `upsert: true`).
- Sur succès : `setRetryAttempt(0)`, `setLastFailureWasNetwork(false)`.
- Catch enrichi :
  ```text
  if (isNetworkError(err)) setLastFailureWasNetwork(true);   // ne pas reset audioBlob
  else setLastFailureWasNetwork(false);                       // comportement actuel
  ```

**Wording dynamique** (`PROCESSING_STEPS`) :
- Si `retryAttempt >= 1` pendant `uploading`/`transcribing` → titre `"On vérifie la connexion…"`, subtitle `"L'enregistrement est bien là."`. Sinon textes actuels.

**Écran d'erreur** (remplace lignes 220-241) :

```text
<bloc glass existant inchangé>
  <WifiOff size={32} className="mx-auto mb-4" style={{ color: "#8A9BAE" }} />     // si network
  <h2>Connexion instable</h2>                                                      // si network
  <h2>Une erreur est survenue</h2>                                                 // sinon (existant)
  <p>Rien n'est perdu. L'enregistrement peut être renvoyé dès que la connexion est bonne.</p>  // si network
  <p>Votre enregistrement a bien été reçu. Nous réessaierons...</p>                // sinon (existant)
  <p text-xs muted>{errorMessage}</p>

  {lastFailureWasNetwork && audioBlob ? (
    <div flex gap-3>
      <Button variant="ghost" onClick={() => { reset(); navigate("/timeline"); }}>Annuler</Button>
      <Button onClick={() => { setProcessingStatus("idle"); processMemo(audioBlob); }} primary>
        Renvoyer le mémo
      </Button>
    </div>
  ) : (
    <Button onClick={() => navigate("/timeline")}>Retour à la timeline</Button>
  )}
</bloc>
```

## 5. `src/components/synthese/WiredMicOrb.tsx`

**Imports** : `WifiOff` (lucide).

**Destructurer** : `retry`, `canRetry`, `cancelPendingRetry`, `retryAttempt`.

**Orb** : si `canRetry` → `opacity: 0.55`, `pointerEvents: "none"`. Sinon comportement actuel.

**Label `<span>` principal** :
```text
isRecording                              → formatTime(elapsedSeconds)
isTranscribing && retryAttempt === 0     → "Envoi en cours…"
isTranscribing && retryAttempt >= 1      → "On vérifie la connexion…"
canRetry                                 → masqué
sinon                                    → "Appuyez pour parler"
```

**Sous-texte secondaire NOUVEAU** (décision 3) :
```text
{isTranscribing && retryAttempt >= 1 && (
  <span className="text-[11px] font-sans mt-0.5" style={{ color: "#9A9490", opacity: 0.75 }}>
    L'enregistrement est bien là.
  </span>
)}
```

**Bloc d'erreur** :
```text
{canRetry ? (
  <div className="mt-2 w-full max-w-[300px] rounded-2xl p-4 text-center" style={glassmorphism}>
    <WifiOff size={22} ... />
    <p font-serif font-semibold>Connexion instable</p>
    <p text-[12px]>Rien n'est perdu. L'enregistrement peut être renvoyé dès que la connexion est bonne.</p>
    <div flex gap-2 justify-center>
      <button onClick={cancelPendingRetry}>Annuler</button>
      <button onClick={async () => { const text = await retry(); if (text) onTranscription(text); }}
        gradient corail-lavande>Renvoyer le mémo</button>
    </div>
  </div>
) : error ? (
  <span text-[12px] color="#E8736A">{error}</span>     // ← messages mic/durée/métier inchangés
) : null}
```

**Préservation des messages existants** :
- Mic indisponible (`"Microphone non disponible — utilise la saisie texte."`) → branche `error` (rouge), pas de bloc CTA.
- Durée trop courte (`"Enregistrement trop court — parlez au moins X secondes."`) → branche `error`, pas de bloc CTA.
- Transcription vide / quota / autre métier (`"Transcription échouée — réessaie ou utilise la saisie texte."`) → branche `error`, pas de bloc CTA.
- Réseau (`"Connexion instable"` + `pendingRetry=true`) → branche `canRetry`, bloc CTA.

## Logs ajoutés

- `console.info("[vocal-recording] retry attempt", { hook, mode, attempt, reason, timestamp })`
- `console.info("[vocal-recording] manual retry requested", { hook, mode, timestamp })`
- `console.info("[vocal-recording] manual retry cancelled", { hook, mode, timestamp })`

Pas de PII.

## Garanties

- ✅ `upsert: true` côté NouveauMemoVocal : même `storagePath` réutilisé.
- ✅ `upsert: false` côté useVocalRecording : nouveau UUID par tentative.
- ✅ "Connexion instable" exclusivement sur erreurs réseau matchées par `isNetworkError`.
- ✅ Tous les autres messages d'erreur (mic, durée, métier) préservés sur tous les call-sites.
- ✅ Aucune nouvelle dépendance npm.
- ✅ Signature publique `useVocalRecording` inchangée.
- ✅ Pattern matching strict : pas de retry sur 4xx/5xx applicatifs.
- ✅ Blob libéré sur succès, annulation explicite, erreur non-réseau. Conservé uniquement sur erreur réseau persistante.
- ✅ Logs `[vocal-recording]` existants conservés.

## Hors scope

- IndexedDB / persistance cross-session.
- Autres call-sites WiredMicOrb (Lots 2/3).
- Modification seuil `minDuration` ou fallback `mimeType`.

