

## Plan: Add Matériel section to ChildProfile.tsx

**File**: `src/pages/ChildProfile.tsx` (only)

### 6 surgical edits (using original line numbers):

1. **Lines 9-10** — Add imports for MaterielCard and MaterielModal after SoinModal import

2. **Lines 34-38** — Add materiel state variables after soins state block

3. **Line 44** — Extend select query to include `has_materiel`

4. **Line 52** — Add `setHasMateriel(data.has_materiel ?? false)` after `setHasSoins`

5. **Lines 59-63** — Add `fetchMateriel()` call in second useEffect, and add `fetchMateriel`, `toggleHasMateriel`, `deleteMateriel` functions after `deleteSoin`

6. **Lines 360-377** — After Soins section closing div (line 360), insert Materiel JSX section + MaterielModal before the editingInfos block. Toggle color: `#E8A44A`. Text color: `#92560A`. Icon: 🔧.

### Technical details

- State: `materiel`, `hasMateriel`, `materielModalOpen`, `editingMateriel`
- `fetchMateriel`: queries `materiel` table filtered by `enfant_id` + `actif=true`, auto-sets `has_materiel` on enfants if items exist
- `toggleHasMateriel`: updates local state + enfants table
- `deleteMateriel`: soft-delete via `actif: false`, then refetch
- JSX mirrors Soins section exactly: toggle switch, empty state with "+ Ajouter", card list with MaterielCard, "Ajouter du matériel" button with Plus icon
- MaterielModal placed alongside existing modals with same callback pattern

