create table if not exists public.exercise_names (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, created_at timestamptz not null default now(), unique (user_id, name));
create table if not exists public.plans (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, name text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table if not exists public.plan_items (id uuid primary key default gen_random_uuid(), plan_id uuid not null references public.plans(id) on delete cascade, exercise_name text not null, mode text not null default 'reps', sets integer not null default 3, reps integer not null default 10, duration integer not null default 40, weight numeric not null default 0, rest integer not null default 60, sort_order integer not null default 0);
-- plan_id is only an optional reference. Historical records and their sets must survive plan edits and deletion.
create table if not exists public.training_records (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, plan_id uuid, plan_name text not null, started_at timestamptz, finished_at timestamptz not null default now(), notes text);
create table if not exists public.training_sets (id uuid primary key default gen_random_uuid(), record_id uuid not null references public.training_records(id) on delete cascade, exercise_name text not null, set_index integer not null, sort_order integer, mode text, completed boolean not null default true, target_reps integer, target_seconds integer, planned_weight numeric, planned_rest integer, actual_reps integer, actual_weight numeric, actual_seconds integer);
create table if not exists public.user_settings (user_id uuid primary key references auth.users(id) on delete cascade, sounds jsonb not null default '{}'::jsonb, updated_at timestamptz not null default now());
create table if not exists public.body_weights (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade, recorded_at timestamptz not null default now(), recorded_on date not null default ((now() at time zone 'Asia/Shanghai')::date), kg numeric(5,2) not null check (kg > 0 and kg < 1000), note text);
create table if not exists public.sleep_records (id text primary key, user_id uuid not null references auth.users(id) on delete cascade, asleep_at timestamptz, wake_at timestamptz, note text, check (asleep_at is not null or wake_at is not null), check (wake_at is null or asleep_at is null or wake_at > asleep_at));
create table if not exists public.challenge_attempts (id text primary key, user_id uuid not null references auth.users(id) on delete cascade, level_id text not null, stage text not null, recorded_at timestamptz not null, rows jsonb not null, quality_confirmed boolean not null default false, note text, snapshot jsonb not null);
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception '未登录，无法注销账号';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public;
grant execute on function public.delete_my_account() to authenticated;
notify pgrst, 'reload schema';
alter table public.body_weights add column if not exists recorded_on date;
update public.body_weights set recorded_on = (recorded_at at time zone 'Asia/Shanghai')::date where recorded_on is null;
with duplicates as (select id, row_number() over (partition by user_id, recorded_on order by recorded_at desc, id desc) as row_number from public.body_weights) delete from public.body_weights where id in (select id from duplicates where row_number > 1);
alter table public.body_weights alter column recorded_on set not null;
create unique index if not exists body_weights_user_recorded_on_key on public.body_weights (user_id, recorded_on);
alter table public.training_sets add column if not exists planned_weight numeric;
alter table public.training_sets add column if not exists sort_order integer;
alter table public.training_sets add column if not exists mode text;
alter table public.training_sets add column if not exists planned_rest integer;
alter table public.exercise_names enable row level security;
alter table public.body_weights enable row level security;
alter table public.challenge_attempts enable row level security;
alter table public.plans enable row level security;
alter table public.plan_items enable row level security;
alter table public.training_records enable row level security;
alter table public.training_sets enable row level security;
alter table public.user_settings enable row level security;
alter table public.sleep_records enable row level security;

drop policy if exists "users manage own exercise names" on public.exercise_names;
create policy "users manage own exercise names" on public.exercise_names for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own plans" on public.plans;
create policy "users manage own plans" on public.plans for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own plan items" on public.plan_items;
create policy "users manage own plan items" on public.plan_items for all to authenticated using (exists (select 1 from public.plans where plans.id = plan_items.plan_id and plans.user_id = auth.uid())) with check (exists (select 1 from public.plans where plans.id = plan_items.plan_id and plans.user_id = auth.uid()));
drop policy if exists "users manage own training records" on public.training_records;
create policy "users manage own training records" on public.training_records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own training sets" on public.training_sets;
create policy "users manage own training sets" on public.training_sets for all to authenticated using (exists (select 1 from public.training_records where training_records.id = training_sets.record_id and training_records.user_id = auth.uid())) with check (exists (select 1 from public.training_records where training_records.id = training_sets.record_id and training_records.user_id = auth.uid()));
drop policy if exists "users manage own settings" on public.user_settings;
create policy "users manage own settings" on public.user_settings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own body weights" on public.body_weights;
create policy "users manage own body weights" on public.body_weights for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own sleep records" on public.sleep_records;
create policy "users manage own sleep records" on public.sleep_records for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "users manage own challenge attempts" on public.challenge_attempts;
create policy "users manage own challenge attempts" on public.challenge_attempts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
