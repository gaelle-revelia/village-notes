

## Plan: Add `autoResize` prop to Textarea + apply to 21 fields

### 1. Modify `src/components/ui/textarea.tsx`

Add `autoResize?: boolean` to the props interface. When true:
- Attach an `onInput` handler that resets height then sets it to `scrollHeight`
- Merge with any existing `onInput` from props
- Add `overflow-y: hidden` and `resize: none` classes
- Use a callback ref (merged with forwarded ref) to set initial height on mount

```
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  autoResize?: boolean;
}
```

### 2. Apply `autoResize` to all 21 fields

Files using `<Textarea>` component — just add `autoResize`:

| File | Field(s) |
|---|---|
| `NouvelEvenement.tsx` | Description |
| `NouvelleQuestion.tsx` | Précisions |
| `NouveauMemoVocal.tsx` | Text input |
| `TextInputView.tsx` | Text input |
| `OutilsActiviteChrono.tsx` | Notes |
| `OutilsActiviteManuel.tsx` | Notes |
| `PreciserBlocDrawer.tsx` | Precision input |
| `OutilsSyntheseMdph.tsx` | Q3, Q4, Q5, Q6 textareas |
| `OutilsSyntheseTransmission.tsx` | Section answer textarea (×6, single JSX) |
| `OutilsSynthesePickMeUp.tsx` | Free text |
| `OutilsSyntheseRdvBriefing.tsx` | Free text |
| `MemberDetailPanel.tsx` | Notes libres |
| `VillageSettings.tsx` | Notes |

Files using raw `<textarea>` — convert to `<Textarea autoResize>`:

| File | Field(s) |
|---|---|
| `NouvelleNote.tsx` | Note text (currently raw `<textarea rows={5}>`) |
| `MemoResult.tsx` | actNote, resume, details, à retenir (4 raw textareas) |

### 3. Files NOT touched
- `OutilsQuestions.tsx` — already has inline auto-resize logic (keep as-is)
- Auth forms, Waitlist.tsx — excluded
- `CarteProgressionOnboarding.tsx`, `AxeDetail.tsx` — not in audit list

### Technical details

The `Textarea` component will:
1. Destructure `autoResize` and `onInput` from props
2. Use `useCallback` ref that merges with forwarded `ref` to set initial height
3. Wrap `onInput`: reset height to `'auto'`, set to `scrollHeight + 'px'`, then call original `onInput`
4. When `autoResize`, add `overflow-hidden resize-none` to className

