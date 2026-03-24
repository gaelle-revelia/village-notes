

## Plan: Move Genre to read-only in card, editable in modal

**File**: `src/pages/ChildProfile.tsx` (only)

### 6 edits (original line numbers):

1. **Line 28** — Add `editSexe` state after `savingInfos`:
   ```ts
   const [editSexe, setEditSexe] = useState<string | null>(null);
   ```

2. **Lines 261-271** — Replace Genre row (interactive pills) with read-only row:
   ```tsx
   <div className="flex items-center justify-between py-2.5 last:pb-0">
     <span className="text-sm text-muted-foreground" style={{ fontFamily: "DM Sans" }}>Genre</span>
     <span className="text-sm font-medium text-foreground" style={{ fontFamily: "DM Sans" }}>
       {sexe === "F" ? "Fille" : sexe === "M" ? "Garçon" : "—"}
     </span>
   </div>
   ```

3. **Lines 221-225** — Add `setEditSexe(sexe)` in the Modifier button's onClick:
   ```ts
   setEditSexe(sexe);
   setEditingInfos(true);
   ```

4. **Lines 534-535** — After the Situation input div (line 533), insert Genre field with toggle pills using `editSexe`/`setEditSexe`

5. **Lines 181-184** — Add `sexe: editSexe,` to the update payload in `handleSaveInfos`

6. **Line 191** — Add `setSexe(editSexe);` in the save success block after existing setters

