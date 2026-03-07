

## Plan: Add editable description field in AxeDetail

### Changes needed

**1. `src/pages/SelenaScreen.tsx`** — Pass `description` through to AxeDetail

- Update `Axe` interface to include `description: string | null`
- Update the Supabase query (line 91) to also select `description`
- Add `onUpdateDescription` handler that updates local state
- Pass `axe` (now with description) and `onUpdateDescription` to `<AxeDetail>`

**2. `src/components/progression/AxeDetail.tsx`** — Add editable description

- Update `AxeDetailProps.axe` to include `description?: string | null`
- Add `onUpdateDescription?: (desc: string) => void` to props
- Add state: `editingDesc` (boolean), `descDraft` (string)
- After the pepite count `<p>` (line 330), insert a new block:
  - Display mode: `<p>` showing description text or italic placeholder
  - Edit mode: `<textarea>` with auto-height, no border, subtle bg
  - On click → enter edit mode
  - On blur → save to Supabase (`axes_developpement.description`), call `onUpdateDescription`, exit edit mode

No other files touched.

