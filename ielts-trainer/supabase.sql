create table if not exists public.training_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('reading','listening','vocabulary')),
  topic text not null default '',
  notes text not null default '',
  correct integer not null default 0 check (correct >= 0),
  total integer not null default 0 check (total >= 0),
  minutes integer not null default 0 check (minutes >= 0),
  created_at timestamptz not null default now()
);

alter table public.training_sessions enable row level security;

create policy "users can read own training sessions"
on public.training_sessions for select
using (auth.uid() = user_id);

create policy "users can insert own training sessions"
on public.training_sessions for insert
with check (auth.uid() = user_id);

create policy "users can update own training sessions"
on public.training_sessions for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "users can delete own training sessions"
on public.training_sessions for delete
using (auth.uid() = user_id);

create index if not exists training_sessions_user_created_idx
on public.training_sessions(user_id, created_at desc);
