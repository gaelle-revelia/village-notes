
Build scope

- Extend the existing backend function `process-memo` with a new mode: `question_reformulation`
- Update `src/pages/NouvelleQuestion.tsx` to call that new mode and populate both:
  - `text`
  - `precisions`
- No new table needed; `public.questions.precisions` already exists

1. Current `transcription_only` flow in `process-memo` (exact flow)

Request handling
- The function checks CORS and handles `OPTIONS`
- It requires an `Authorization: Bearer ...` header
- It validates the JWT by calling `auth.getClaims(token)`
- It reads `{ memo_id, mode, text_input, audio_path }` from the request body

Branch for `mode === "transcription_only"`
- It does not require `memo_id`
- It requires `audio_path`; otherwise returns `400`
- It creates a service-role client
- It downloads the audio file from storage bucket `audio-temp` using `audio_path`
- It converts the downloaded binary into base64
- It calls the Lovable AI gateway with model `google/gemini-3-flash-preview`
- Prompt used today:
  - system: transcribe faithfully in French, return only transcript text
  - user: multimodal payload containing `input_audio` + text instruction
- After the AI call, it deletes the uploaded audio from `audio-temp`
- Error handling:
  - `429` => returns rate-limit error
  - `402` => returns credits-exhausted error
  - other failures => `500 Transcription failed`
- Success response:
  - returns `{ transcription }`

Important detail
- `transcription_only` is fully isolated from `memos`
- No memo row is read or updated in this branch

2. Where and how the Gemini / AI call is made

There are currently several direct AI gateway calls inside `supabase/functions/process-memo/index.ts`, all using:
- URL: `https://ai.gateway.lovable.dev/v1/chat/completions`
- auth header: `Authorization: Bearer ${lovableApiKey}`
- model: `google/gemini-3-flash-preview`

Current AI call locations
- `detectPepites(...)`
  - used after memo processing to map memos to axes
- `transcription_only` branch
  - transcribes raw uploaded audio
- voice memo branch
  - transcribes `${userId}/${memo_id}.webm`
- `text_quick` branch
  - generates a short factual summary JSON
- main structuring branch
  - structures a memo with tool-calling

For your requested feature, the natural place is:
- directly after the existing transcription step in a new `mode === "question_reformulation"` branch
- reusing the same AI gateway pattern already present in the file

3. What adding `question_reformulation` would require

Backend design
- Add a new early branch alongside `transcription_only`
- Reuse the same first half as `transcription_only`:
  1. validate `audio_path`
  2. download from `audio-temp`
  3. convert to base64
  4. transcribe audio through Gemini
  5. delete uploaded audio
- Then add a second AI call for reformulation

Requested Step 2 prompt
- Use this exact prompt as the system message:
```text
Tu es un assistant qui aide des parents d'enfants en situation de handicap. À partir de cette transcription, formule une question principale courte et claire (max 15 mots), et si nécessaire des précisions complémentaires (max 2 phrases). Réponds uniquement en JSON: { question: '...', precisions: '...' }
```

Recommended backend response contract
- On success return:
  - `{ question, precisions }`
- Keep `precisions` nullable / empty-friendly
- Best normalization:
  - if missing or blank, return `precisions: null`

Recommended parsing approach
- Use the same JSON-cleaning pattern already used elsewhere in `process-memo`
- Parse response content, then safely extract:
  - `question: string`
  - `precisions: string | null`

Error handling needed
- Same status handling as transcription:
  - `429`
  - `402`
  - generic `500`
- Add one extra guarded failure:
  - if reformulation JSON is invalid or `question` is empty, return a controlled error instead of malformed success

Minimal backend change footprint
- Only `supabase/functions/process-memo/index.ts`
- No schema change
- No RLS change
- No memo pipeline change for existing modes

4. What changes in `NouvelleQuestion.tsx` would be needed

What the page does today
- Uses `useAudioRecorder`
- When `audioBlob` appears, it:
  - uploads audio to `audio-temp/synthesis/<uuid>.<ext>`
  - invokes `process-memo` with `{ mode: "transcription_only", audio_path }`
  - reads `data.transcription`
  - fills `question`
  - switches to text mode
- On submit, it inserts into `questions` only:
  - `parent_id`
  - `child_id`
  - `text`
  - `linked_pro_ids`
  - `status`
- It currently does not manage a `precisions` field at all

Minimal UI/data changes
- Add local state:
  - `const [precisions, setPrecisions] = useState("")`
- Replace the voice invoke call:
  - from `mode: "transcription_only"`
  - to `mode: "question_reformulation"`
- On success:
  - `setQuestion(data.question || "")`
  - `setPrecisions(data.precisions || "")`
  - `setMode("text")`
- Update the text form to show both fields:
  - existing textarea for main question
  - new textarea/input for optional precisions
- Update insert payload to include:
  - `precisions: precisions.trim() || null`

Exact frontend impact area
- Voice transcription effect around the current `supabase.functions.invoke("process-memo", ...)`
- Form state
- Submit insert payload
- Text-mode UI

Minimal implementation plan

1. Backend
- Add `question_reformulation` branch before the `memo_id` requirement
- Reuse `transcription_only` audio download/transcription logic
- Add second AI call with your exact prompt
- Parse and return `{ question, precisions }`

2. Frontend
- Add `precisions` state to `NouvelleQuestion.tsx`
- Switch voice invoke to `question_reformulation`
- Populate both fields from backend response
- Include `precisions` in `questions` insert

3. Keep unchanged
- Existing `voice`, `text`, `text_quick`, `transcription_only` behavior
- Existing auth / RLS
- Existing question list page unless you want precisions displayed there too

Technical notes

- `public.questions.precisions` already exists, so no new migration is needed for this feature
- No RLS policy changes are needed because policies are row-based, not column-based
- `NouvelleQuestion.tsx` currently fetches no `precisions` and writes none, so UI wiring is the main frontend task
- Best placement for the new backend branch is next to `transcription_only`, because both are “no memo interaction” modes
