

## Plan: Add `transcription_only` mode + `useVocalRecording` hook + Wire vocal orbs

Same plan as previously approved, with one correction on Part 3.

### Part 1 — Edge function `process-memo`: add `transcription_only` mode

**File**: `supabase/functions/process-memo/index.ts`

Add early branch before `memo_id` validation. When `mode === "transcription_only"`:
- Parse `audio_path` from body (no `memo_id` needed)
- Download from `audio-temp`, convert to base64, call Gemini with simple transcription prompt
- Delete audio immediately
- Return `{ transcription: "..." }`
- No memo table interaction

### Part 2 — Shared hook `useVocalRecording`

**Create**: `src/hooks/useVocalRecording.ts`

- `startRecording()`: getUserMedia, MediaRecorder, collect chunks
- `stopRecording()`: assemble blob, upload to `audio-temp` as `synthesis/{uuid}.webm`, invoke `process-memo` with `mode: "transcription_only"`, return transcription
- Exposed: `isRecording`, `isTranscribing`, `transcription`, `error`

### Part 3 — Wire orb in Pick-me-up (CORRECTED)

**File**: `src/pages/OutilsSynthesePickMeUp.tsx`

- On transcription success: inject text into `freeText` state **only**
- **Do NOT clear `selectedEmotion`** — chip selection stays intact
- Orb disabled when `emotionDisabled`

### Part 4 — Wire orbs in MDPH

**File**: `src/pages/OutilsSyntheseMdph.tsx`

- Replace static `MicOrb` with interactive `WiredMicOrb` for phases 3, 5, 6
- Each orb appends transcription to its corresponding textarea state

### Part 5 — Wire orbs in Transmission

**File**: `src/pages/OutilsSyntheseTransmission.tsx`

- Replace `MicOrb` in each of the 6 sections with independent `WiredMicOrb`
- Each appends transcription to `answers[idx]`

### Shared `WiredMicOrb` component

**Create**: `src/components/synthese/WiredMicOrb.tsx`

Takes `onTranscription`, `disabled`, `appendMode`. Uses `useVocalRecording` internally. Four visual states: default (gradient + glow), recording (pulse + "En écoute..."), transcribing (spinner + "Transcription..."), error (red text below).

### Files changed
1. `supabase/functions/process-memo/index.ts` — add branch
2. `src/hooks/useVocalRecording.ts` — new
3. `src/components/synthese/WiredMicOrb.tsx` — new
4. `src/pages/OutilsSynthesePickMeUp.tsx` — wire orb
5. `src/pages/OutilsSyntheseMdph.tsx` — wire orbs
6. `src/pages/OutilsSyntheseTransmission.tsx` — wire orbs

