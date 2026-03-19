
What I found

- The tools grid is defined directly in `src/pages/OutilsScreen.tsx`.
- It is driven by the local `TOOLS` array at the top of the file.
- Each card is rendered by mapping over `TOOLS`, so adding one more active card only requires adding one more object to that array.
- Active cards automatically inherit the same glass styling, gradient icon background, click behavior, and enabled state.
- The route `/outils/questions` is not currently registered in `src/App.tsx`.

Clean implementation plan

1. Update only `src/pages/OutilsScreen.tsx`
- Import `MessageCircleQuestion` from `lucide-react`
- Add a new object in the existing `TOOLS` array

2. Insert the new tool card in the requested place
- Position it in the array where you want it to appear in the existing grid
- Use:
  - `label: "Questions à poser"`
  - `icon: MessageCircleQuestion`
  - `route: "/outils/questions"`
  - `active: true`

3. Leave all rendering logic unchanged
- No changes to the card map/render code
- No changes to existing tool cards
- No changes to button behavior, auth logic, or styles

Important note

- With your requested file scope, this would only add the card in the grid.
- Because `/outils/questions` does not currently exist in `src/App.tsx`, clicking the new card would navigate to the fallback page until that route is added later.
- If you want the card to be fully functional, a later step would need to add that route in `src/App.tsx`.

Result

- Only one file changes: `src/pages/OutilsScreen.tsx`
- Existing cards remain untouched
- The new card visually matches the other active tool cards automatically
