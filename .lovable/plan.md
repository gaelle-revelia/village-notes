

## Plan: Add 3 columns to `memos` + Build 4 creation screens

### 1. Database Migration

Add 3 new columns to the `memos` table:
- `type` (text, NOT NULL, default `'vocal'` -- default needed so existing rows don't break)
- `memo_date` (date, NOT NULL, default `CURRENT_DATE`)
- `file_url` (text, nullable)

A CHECK constraint will enforce `type IN ('vocal', 'note', 'document', 'evenement')`.

Existing memos will default to `type='vocal'` and `memo_date=CURRENT_DATE`.

### 2. Shared Components

**IntervenantSelect** -- A reusable dropdown/select for picking an intervenant (nom + specialite), used by screens 1-3. Fetches from `intervenants` table filtered by `enfant_id`.

**useEnfantId hook** -- Extract the "fetch first enfant" logic (already in `RecordMemo.tsx`) into a small shared hook so all 4 screens can reuse it.

### 3. Screen Implementations

All screens share the same layout pattern: header with back arrow to `/timeline`, form fields, and a save button that inserts into `memos`.

**Screen 1 -- NouveauMemoVocal** (`/nouveau-memo-vocal`, type='vocal')
- Fields: memo_date (date picker, default today), intervenant_id (optional select), audio recording
- Reuses existing `RecordingView` and `TextInputView` components
- On save: inserts memo with `type='vocal'`, `processing_status='pending'`, calls `process-memo` edge function (same as current `RecordMemo`)
- Essentially a refactored version of the existing `RecordMemo` page with memo_date added

**Screen 2 -- NouvelleNote** (`/nouvelle-note`, type='note')
- Fields: memo_date (date picker), intervenant_id (optional select), text content (textarea)
- On save: inserts memo with `type='note'`, `transcription_raw=text`, `processing_status='done'`
- No AI processing for now

**Screen 3 -- NouveauDocument** (`/nouveau-document`, type='document')
- Fields: memo_date (date picker), intervenant_id (optional select), file upload (PDF/image)
- On save: uploads file to `voice-memos` bucket (or a new `documents` bucket), stores URL in `file_url`, inserts memo with `type='document'`, `processing_status='pending'`

**Screen 4 -- NouvelEvenement** (`/nouvel-evenement`, type='evenement')
- Fields: memo_date (date picker), title (short text input), description (optional textarea)
- No intervenant picker
- On save: inserts memo with `type='evenement'`, `transcription_raw=title`, `content_structured={ description }`, `processing_status='done'`

### 4. Technical Details

```text
Files to create/modify:
+----------------------------------------------+
| NEW: src/hooks/useEnfantId.ts                |  shared hook
| NEW: src/components/memo/IntervenantSelect.tsx|  reusable select
| NEW: src/components/memo/MemoDatePicker.tsx   |  reusable date picker
| EDIT: src/pages/NouveauMemoVocal.tsx          |  full implementation
| EDIT: src/pages/NouvelleNote.tsx              |  full implementation
| EDIT: src/pages/NouveauDocument.tsx           |  full implementation
| EDIT: src/pages/NouvelEvenement.tsx           |  full implementation
| MIGRATION: add type, memo_date, file_url     |  DB schema change
+----------------------------------------------+
```

- Date picker uses the existing `Calendar` + `Popover` (Shadcn pattern) with `pointer-events-auto`
- IntervenantSelect uses existing `Select` component from shadcn
- File upload for documents uses Supabase Storage (`voice-memos` bucket or a new `documents` bucket)
- All screens auto-set `user_id` from `useAuth()` and `enfant_id` from `useEnfantId()`
- Back button navigates to `/timeline` without saving
- Toast notifications on success/error
- The existing `RecordMemo` page and `/record` route remain untouched (backward compatible)

