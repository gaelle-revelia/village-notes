

## Plan: Add Traitements & Soins sections to ChildProfile

### Single file to modify: `src/pages/ChildProfile.tsx`

**1. Add imports** (line 3): Add `Plus` from lucide-react, plus the 4 new components (MedicamentCard, MedicamentModal, SoinCard, SoinModal).

**2. Add state variables** (after line 13): medicaments, hasMedicaments, medModalOpen, editingMed, soins, hasSoins, soinModalOpen, editingSoin.

**3. Extend existing useEffect** (line 19): Change select to include `has_medicaments, has_soins`. Set the new state from data.

**4. Add functions** (after handleSexeChange): fetchMedicaments, fetchSoins, toggleHasMedicaments, toggleHasSoins, deleteMedicament, deleteSoin.

**5. Add second useEffect**: Fetch medicaments and soins when enfantId is available.

**6. Add JSX sections** (after line 77, replacing line 79 placeholder):
- **Traitements section**: Toggle switch (purple #8B74E0), list of MedicamentCards, "Ajouter" button with Plus icon.
- **Soins particuliers section**: Toggle switch (green #44A882), list of SoinCards, "Ajouter" button with Plus icon.
- Both sections only show content when toggled active.

**7. Add modals** (before closing `</div>` of component): MedicamentModal and SoinModal with proper open/close/save handlers.

**8. Remove** the placeholder paragraph on line 79.

No other files modified.

