

## Complete Voice Memo Recording Feature

### Overview

Rebuild the NouveauMemoVocal screen with the exact design system, processing pipeline, freemium gate, and result screen. The existing `process-memo` edge function already handles transcription + structuring via Lovable AI (Gemini) -- we'll refactor it to match the new spec (updated system prompt, new structured output format, `audio-temp` bucket, status updates).

### Important: AI Provider

The spec mentions OpenAI Whisper and GPT-4o, but this project uses **Lovable AI gateway** (pre-configured, no extra API key needed). Gemini handles both audio transcription (multimodal) and text structuring with tool calling. The result is identical -- we just don't need an `OPENAI_API_KEY`.

---

### 1. Database: Create `audio-temp` Storage Bucket

Create a new storage bucket `audio-temp` (private) for temporary audio uploads. Add RLS policies so authenticated users can upload/read/delete their own files (path prefix = `user_id/`).

### 2. Freemium Gate

Before recording starts, query the count of vocal memos this month. If >= 10, show a modal instead of starting the recording. The modal has a "Passer en Premium" button (shows "bientot disponible" toast) and a "Pas maintenant" dismiss button.

### 3. NouveauMemoVocal Screen Redesign

Complete rewrite following the exact design system:

**Header**: Back arrow + "Nouveau memo" (H2, Crimson Text)

**Date field**: "Date de la seance" label, formatted DD MMMM YYYY, tappable date picker. Uses existing `MemoDatePicker` component (minor style tweaks).

**Intervenant selection**: Fetch intervenants by enfant_id. Display as selectable chips (not a dropdown). Single select, optional. Styled per spec (selected: #6B8CAE bg, white text / unselected: white bg, #E8E3DB border, #6B5B73 text). Empty state: muted text, no blocking.

**Recording button**: Large centered button (min-height 64px, border-radius 12px). Default: #6B8CAE bg, "Enregistrer" label. Recording: #E05555 bg, "Arreter", pulse animation. Timer below. Text fallback link below.

**Processing overlay**: Full-screen white overlay (not navigation) showing current step with icon/title/subtitle. Steps: uploading, transcribing, structuring, done, error. On done: navigate to `/memo-result/:id`. On error: show message + "Retour a la timeline" button. Memo row is kept on error.

### 4. Edge Function Refactor: `process-memo`

Update the existing `process-memo` function:

- Accept `audio_path` parameter (for `audio-temp` bucket)
- Download from `audio-temp` bucket instead of `voice-memos`
- Update status to `transcribing` then `structuring` then `done`
- Use the new system prompt from the spec (strict rules about no diagnosis, parent vocabulary only)
- Update structured output schema: `resume`, `details` (was `points_cles`), `suggestions`, `tags`, `intervenant_detected`
- Delete audio from `audio-temp` after transcription
- On any failure: set `processing_status = 'error'`, never delete the memo

### 5. MemoResult Screen

New page at `/memo-result/:id`:

- Fetches the memo by ID from the database
- Header: back arrow + "Memo enregistre" with vert-nature accent
- Date + intervenant name in muted text
- Card sections: Resume, Details (bullet list), A retenir (suggestions, if non-empty), Tags row
- Tags styled as rectangles with 4px left border colored by domain (Moteur: #6B8CAE, Sensoriel: #7C9885, Cognitif: #C4A162, Social: #9B8DB5, Administratif/default: #A8A0A8)
- Bottom button: "Retour a la timeline"

### 6. Client-Side Pipeline Flow

1. User taps "Enregistrer" (after freemium check passes)
2. Request mic permission (handle denial with message)
3. Record audio (MediaRecorder, webm)
4. On stop: show processing overlay at "uploading" step
5. Insert memo row (type='vocal', processing_status='uploading')
6. Upload blob to `audio-temp/{user_id}/{memo_id}.webm`
7. Update overlay to "transcribing", invoke `process-memo` edge function
8. Edge function returns result; update overlay to "structuring" briefly, then navigate to result page
9. On error: show error overlay, keep memo row

### 7. Routing

Add route `/memo-result/:id` in App.tsx for the new MemoResult page.

---

### Files to Create/Modify

```text
+--------------------------------------------------+
| NEW:  src/pages/MemoResult.tsx                   |  Result display page
| EDIT: src/pages/NouveauMemoVocal.tsx             |  Full redesign
| EDIT: src/components/memo/RecordingView.tsx      |  Style updates
| EDIT: src/components/memo/MemoResultView.tsx     |  Adapt to new schema
| EDIT: supabase/functions/process-memo/index.ts   |  New prompt + schema
| EDIT: src/App.tsx                                |  Add /memo-result route
| MIGRATION: Create audio-temp bucket + policies   |  Storage setup
+--------------------------------------------------+
```

### Design System Applied

- All colors, typography, spacing, card styles, tag styles, and button styles follow the spec exactly
- Crimson Text for headings, Inter for body
- Mobile-first (375px base), 8px spacing grid
- No gradients anywhere

