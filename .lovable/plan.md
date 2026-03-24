

## Plan: Add editable INFORMATIONS bottom sheet in ChildProfile.tsx

**Single file**: `src/pages/ChildProfile.tsx`

### Changes

1. **Add state variables** (after existing state declarations):
   - `editingInfos`, `editPrenom`, `editDateNaissance`, `editDiagnostic`, `savingInfos`

2. **Add `handleSaveInfos` function** (after existing handlers):
   - Updates `enfants` table with edited prenom, date_naissance, diagnostic_label
   - On success, updates local state and closes modal

3. **Replace INFORMATIONS header** with flex row containing label + "Modifier" button:
   - Button populates edit fields from current state and opens modal

4. **Add bottom sheet modal** (before closing `</div>`, alongside existing modals):
   - Fixed overlay with semi-transparent backdrop
   - Bottom sheet with drag handle, title, 3 input fields (Prénom, Date de naissance, Situation)
   - Gradient "Enregistrer" button + "Annuler" link
   - All styling per user specification (rounded-xl inputs, DM Sans font, purple focus ring)

No other files touched. No changes to modals, toggles, fetch functions, or onboarding.
