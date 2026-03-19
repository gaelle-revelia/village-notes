
Goal: add a new backend-only `questions` table proposal that fits the current schema and security model, without touching any existing tables, pages, or components.

1. Align the spec with current project conventions
- Use `public.enfants` as the child table (the project does not have `children`).
- Do not create a foreign key to `auth.users`; this project convention is to store a plain `parent_id uuid not null` and enforce ownership through RLS.
- Keep `child_id uuid not null references public.enfants(id)`.
- Keep `linked_pro_ids uuid[]` for now, interpreted as linked `intervenants.id` values. No FK is possible on an array column, so this is best-effort storage only.

2. Proposed table shape
```sql
public.questions
- id uuid primary key default gen_random_uuid()
- parent_id uuid not null
- child_id uuid not null references public.enfants(id) on delete cascade
- text text not null
- linked_pro_ids uuid[] not null default '{}'
- status text not null default 'to_ask'
- answer text null
- created_at timestamptz not null default now()
- asked_at timestamptz null
- show_in_timeline boolean not null default true
```

3. Validation approach
Because this project avoids fragile CHECK constraints for business rules, add a small validation trigger/function instead of a CHECK:
- allow only `status in ('to_ask', 'asked')`
- optional consistency rule:
  - if `status = 'asked'`, `asked_at` may be set
  - if `status = 'to_ask'`, `asked_at` can remain null
I would keep validation minimal unless you want stricter workflow rules.

4. RLS proposal
Enable RLS on `public.questions` and scope everything to `authenticated`.

Policies:
- SELECT: parent reads only own rows
  - `USING (parent_id = auth.uid())`
- INSERT: parent creates only own rows, and only for their own child
  - `WITH CHECK (parent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.enfants e WHERE e.id = child_id AND e.user_id = auth.uid()))`
- UPDATE: parent updates only own rows, and cannot move a question to another parent/child they do not own
  - `USING (parent_id = auth.uid())`
  - `WITH CHECK (parent_id = auth.uid() AND EXISTS (SELECT 1 FROM public.enfants e WHERE e.id = child_id AND e.user_id = auth.uid()))`
- DELETE: parent deletes only own rows
  - `USING (parent_id = auth.uid())`

This is stricter than “own questions” alone, because it also prevents attaching a question to another user’s child.

5. Why this fits the current app
- Existing ownership tables (`enfants`, `profiles`, `nsm_scores`) rely on `user_id`-style UUID ownership plus RLS, not FKs to the auth schema.
- Child-facing records generally reference `enfants(id)`.
- Security hygiene in this project prefers explicit `TO authenticated` policies.

6. Timeline compatibility note
The field `show_in_timeline` is a good fit for future timeline integration, but no timeline changes are needed now.
If you later surface questions in the timeline, the minimum extra fields already exist:
- `text`
- `status`
- `answer`
- `asked_at`
- `show_in_timeline`
- `created_at`

7. Main caveat
`linked_pro_ids uuid[]` is acceptable for a first version, but if you later need:
- referential integrity to `intervenants`
- filtering by professional
- analytics/reporting
- easier joins
then a junction table like `question_intervenants(question_id, intervenant_id)` will be a better long-term model. For this request, I would keep the array to avoid touching other schema.

8. Implementation plan
- Create one migration that:
  - creates `public.questions`
  - creates the validation function/trigger for `status`
  - enables RLS
  - adds 4 policies: select / insert / update / delete
- Regenerate backend types automatically
- Do not modify any UI, routes, or existing tables

9. Expected final behavior
- Logged-in parents can create, read, edit, and delete only their own questions
- They cannot create questions for another parent or another parent’s child
- Anonymous users cannot access the table
- The schema remains consistent with the current project architecture
