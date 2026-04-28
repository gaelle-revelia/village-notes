
# Réinvocation manuelle de process-memo sur memo `280ea1eb…`

## Objectif

Relancer le pipeline de transcription pour ce memo bloqué en `transcribing`, après avoir sauvegardé l'audio source.

## Contraintes respectées

- Aucune modification permanente du code applicatif.
- Aucune nouvelle edge function permanente : les 2 fonctions debug créées seront supprimées immédiatement après usage.
- Audio sauvegardé avant tout appel (process-memo termine par un `try/finally` qui supprime l'objet d'`audio-temp`).

## Paramètres reproduits depuis NouveauMemoVocal.tsx (lignes 182-195)

Body envoyé à `process-memo` :
```json
{
  "memo_id": "280ea1eb-1ceb-4e75-bca8-9d6de90874f6",
  "mode": "voice",
  "text_input": undefined
}
```

> Le client n'envoie pas `audio_path` : la function le déduit depuis `memo_id` (path = `<user_id>/<memo_id>.webm` dans `audio-temp`).

## Étapes d'exécution

### 1. Sauvegarde de l'audio
Le copy intra-bucket nécessite le service role (RLS bloque sinon). Je déploie une edge function temporaire `debug-copy` qui appelle `supabase.storage.from(bucket).copy(from, to)`.

- Source : `audio-temp/dce7bf78-…/280ea1eb-….webm`
- Destination : `audio-temp/backup/280ea1eb-….webm`
- Vérification : SELECT sur `storage.objects` pour confirmer présence + taille identique (10 146 504 octets).

### 2. Invocation manuelle de process-memo
Via `supabase--curl_edge_functions` (POST `/process-memo` avec le body ci-dessus). Mesure :
- Status code HTTP
- Durée d'exécution (chrono côté outil)
- Body de réponse complet

⚠️ Risque attendu : timeout >150 s probable sur un audio de ~6m30 (déjà observé ce matin, 0 log côté Edge). L'invocation peut donc échouer aussi.

### 3. Vérification BDD post-invocation
SELECT sur `memos` :
- `processing_status` (attendu : `done` ou `error`)
- `transcription_raw`
- `content_structured`
- `created_at` / `updated_at`

Et lecture des logs runtime de `process-memo` via `supabase--edge_function_logs` pour récupérer console.log/error et stack trace éventuelle.

### 4. Restauration éventuelle de l'audio
Si la function a supprimé l'audio source ET qu'on veut pouvoir relancer plus tard, copy backup → path original via `debug-copy`.

### 5. Nettoyage
- `supabase--delete_edge_functions(["debug-copy"])`
- Suppression du dossier `supabase/functions/debug-copy/`
- Suppression du bloc `[functions.debug-copy]` dans `supabase/config.toml`
- Conservation du backup `audio-temp/backup/280ea1eb-….webm` (à supprimer manuellement plus tard si besoin)

## Livrable

Rapport factuel :
- Statut + durée de l'invocation
- État BDD final du memo
- Logs runtime émis pendant l'exécution
- Confirmation présence/absence du backup audio

Aucune correction de code proposée à ce stade.
