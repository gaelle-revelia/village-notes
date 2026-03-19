
What I confirmed

1. NouvelleQuestion.tsx already uses the existing `process-memo` edge function
- `NouvelleQuestion.tsx` imports `useVocalRecording`.
- When the user stops recording, `handleStopRecording()` calls `await stopRecording()`.
- `stopRecording()` is implemented inside `useVocalRecording`, and that hook does this exact flow:
  1. Stops `MediaRecorder`
  2. Builds an audio `Blob`
  3. Rejects recordings shorter than 10s
  4. Uploads the blob to storage bucket `audio-temp` under `synthesis/${uuid}.webm`
  5. Calls `supabase.functions.invoke("process-memo", { body: { mode: "transcription_only", audio_path } })`
  6. Reads `data?.transcription`
  7. Returns that transcription to `NouvelleQuestion.tsx`
- Back in `NouvelleQuestion.tsx`, if transcription is non-empty:
  - it sets `question`
  - switches `mode` to `"text"`
  - shows the “Question transcrite” toast

Conclusion: the hypothesis is false. `NouvelleQuestion.tsx` does already use `process-memo`, via `useVocalRecording`.

2. What NouveauMemoVocal.tsx does
- `NouveauMemoVocal.tsx` does not use `useVocalRecording`; it uses `useAudioRecorder`.
- Its flow is different and more complete:
  1. `useAudioRecorder` records locally and exposes `audioBlob`
  2. On `audioBlob`, `processMemo(audioBlob)` runs
  3. It creates a `memos` row first
  4. Uploads audio to `audio-temp` at `${user.id}/${memo.id}.webm`
  5. Calls `process-memo` with:
     - `memo_id`
     - `mode: "voice"`
  6. The edge function then:
     - downloads the uploaded audio
     - transcribes it
     - continues memo structuring
     - updates DB status fields

Working reference summary:
- `NouvelleQuestion` = transcription-only flow through `process-memo`
- `NouveauMemoVocal` = full memo-processing flow through `process-memo`

3. Minimal fix to align NouvelleQuestion with the working edge-function flow
Cleanest minimal fix:
- Do not replace the edge function.
- Keep `process-memo`.
- Unify the client-side recording strategy by making `NouvelleQuestion.tsx` use the same recording/upload pattern as the working screens.

Recommended minimal implementation
- Replace `useVocalRecording` in `NouvelleQuestion.tsx` with `useAudioRecorder`
- After recording stops and `audioBlob` is available:
  - upload blob to `audio-temp`
  - invoke `process-memo` with `mode: "transcription_only"` and `audio_path`
  - set the returned transcription into `question`
- This keeps question creation logic unchanged and only swaps the recording/transcription client path

Why this is the minimal safe fix
- No DB schema change
- No edge-function change
- No question submission change
- Only one page changes
- It reuses the same recorder behavior already working elsewhere in the app

Important diagnosis
- If transcription is failing today, the likely issue is not “NouvelleQuestion doesn’t use `process-memo`”.
- The likely problem is inside the `useVocalRecording` path itself:
  - browser/media recorder differences
  - upload path/content-type mismatch
  - returned transcription being empty
  - short-recording guard (<10s)
- So the smallest practical fix is to stop depending on `useVocalRecording` for this page and route the page through the same recorder flow already proven in `NouveauMemoVocal`.

Planned change set if implemented next
1. Update `NouvelleQuestion.tsx` only
2. Replace `useVocalRecording` usage with `useAudioRecorder`
3. Add a small local `transcribeAudio(blob)` helper in the page
4. Upload to `audio-temp`
5. Call `process-memo` in `transcription_only` mode
6. Preserve current UX:
   - same mic button
   - same switch to text mode after success
   - same toast behavior
   - same question form submission

Net result
- `NouvelleQuestion` would still use `process-memo`
- But it would use the same proven recording pipeline style as `NouveauMemoVocal`, which is the best minimal fix
