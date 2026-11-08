-- Run this once in the Supabase SQL editor (Project -> SQL -> New query).
-- Students own their results. Everyone signed in can read question edits. Only admins can write them.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('student', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.attempts (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null,
  finished_at timestamptz not null default now()
);
create index if not exists attempts_user_idx on public.attempts (user_id, finished_at desc);

create table if not exists public.answer_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  qid text not null,
  correct boolean not null,
  ts timestamptz not null default now(),
  mode text not null
);
create index if not exists answer_log_user_idx on public.answer_log (user_id, ts desc);

create table if not exists public.question_overrides (
  qid text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

-- Create a student profile automatically when someone signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.attempts enable row level security;
alter table public.answer_log enable row level security;
alter table public.question_overrides enable row level security;

-- A user can read their own profile but can NEVER change their own role.
create policy "read own profile" on public.profiles for select using (id = auth.uid());

create policy "own attempts read" on public.attempts for select using (user_id = auth.uid());
create policy "own attempts insert" on public.attempts for insert with check (user_id = auth.uid());
create policy "own attempts update" on public.attempts for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own log read" on public.answer_log for select using (user_id = auth.uid());
create policy "own log insert" on public.answer_log for insert with check (user_id = auth.uid());

create policy "overrides readable by signed-in users" on public.question_overrides for select using (auth.role() = 'authenticated');
create policy "overrides writable by admins" on public.question_overrides for all using (public.is_admin()) with check (public.is_admin());

-- To make yourself an administrator, after signing up in the app run (replace the email):
--   update public.profiles set role = 'admin' where id = (select id from auth.users where email = 'you@example.com');
