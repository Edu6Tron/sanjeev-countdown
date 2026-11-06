create table if not exists public.user_notes (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text not null default '',
  title text not null default 'Sanjeev',
  updated_at timestamptz not null default now()
);

alter table public.user_notes enable row level security;

revoke all on public.user_notes from anon;
grant select, insert, update on public.user_notes to authenticated;

create policy "Users can read their own notes"
on public.user_notes
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own notes"
on public.user_notes
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own notes"
on public.user_notes
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
