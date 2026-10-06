-- VERIPROOF relational database foundation.
create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create type public.project_status as enum ('ACTIVE', 'ARCHIVED');
create type public.dataset_status as enum ('UPLOADING', 'READY', 'FAILED', 'ARCHIVED');
create type public.claim_status as enum ('PROPOSED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED');
create type public.analysis_session_status as enum ('CREATED', 'RUNNING', 'REPAIRING', 'COMPLETED', 'INCONCLUSIVE', 'FAILED');
create type public.obligation_status as enum ('PENDING', 'PASSED', 'FAILED', 'INCONCLUSIVE', 'WAIVED');
create type public.obligation_type as enum ('DATA_QUALITY', 'COMPUTATION', 'STATISTICAL', 'INTERPRETATION', 'OTHER');
create type public.analysis_run_type as enum ('INITIAL', 'REPAIR', 'REVERIFICATION');
create type public.analysis_run_status as enum ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
create type public.sensitivity_level as enum ('STABLE', 'MODERATE', 'SENSITIVE');
create type public.repair_plan_status as enum ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');
create type public.verdict_type as enum ('PROVABLE', 'INCONCLUSIVE', 'REFUTED');

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  status public.project_status not null default 'ACTIVE',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.datasets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  original_filename text not null,
  storage_path text not null unique,
  content_hash text not null check (length(content_hash) > 0),
  file_size bigint not null check (file_size >= 0),
  status public.dataset_status not null default 'UPLOADING',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id)
);

create table public.dataset_profiles (
  id uuid primary key default gen_random_uuid(),
  dataset_id uuid not null unique references public.datasets(id) on delete cascade,
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null,
  dataset_id uuid not null,
  question_text text not null check (length(btrim(question_text)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, project_id),
  foreign key (project_id) references public.projects(id) on delete cascade,
  foreign key (dataset_id, project_id) references public.datasets(id, project_id) on delete restrict
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  claim_text text not null check (length(btrim(claim_text)) > 0),
  status public.claim_status not null default 'PROPOSED',
  assumptions jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, question_id)
);

create table public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.claims(id) on delete cascade,
  current_run_id uuid,
  status public.analysis_session_status not null default 'CREATED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, claim_id)
);

create table public.proof_obligations (
  id uuid primary key default gen_random_uuid(),
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  obligation_key text not null check (length(btrim(obligation_key)) > 0),
  description text not null check (length(btrim(description)) > 0),
  type public.obligation_type not null default 'OTHER',
  status public.obligation_status not null default 'PENDING',
  required boolean not null default true,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, analysis_session_id),
  unique (analysis_session_id, obligation_key)
);

create table public.analysis_runs (
  id uuid primary key default gen_random_uuid(),
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  parent_run_id uuid,
  run_number integer not null check (run_number > 0),
  run_type public.analysis_run_type not null,
  execution_id text not null,
  code text not null,
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  status public.analysis_run_status not null default 'QUEUED',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, analysis_session_id),
  unique (analysis_session_id, run_number),
  check (completed_at is null or started_at is not null),
  check (completed_at is null or completed_at >= started_at),
  check ((run_type = 'INITIAL' and run_number = 1 and parent_run_id is null)
      or (run_type in ('REPAIR', 'REVERIFICATION') and run_number > 1 and parent_run_id is not null)),
  foreign key (parent_run_id, analysis_session_id)
    references public.analysis_runs(id, analysis_session_id) on delete restrict
);

alter table public.analysis_sessions
  add constraint analysis_sessions_current_run_same_session_fk
  foreign key (current_run_id, id)
  references public.analysis_runs(id, analysis_session_id)
  on delete set null (current_run_id) deferrable initially deferred;

create unique index analysis_runs_one_initial_per_session_idx
  on public.analysis_runs(analysis_session_id) where run_type = 'INITIAL';

create or replace function private.check_analysis_run_lineage()
returns trigger language plpgsql set search_path = '' as $$
declare v_parent_run_number integer;
begin
  if new.parent_run_id is not null then
    if new.parent_run_id = new.id then
      raise exception using errcode = '23514', message = 'run cannot be its own parent';
    end if;
    select r.run_number into v_parent_run_number
      from public.analysis_runs r
      where r.id = new.parent_run_id and r.analysis_session_id = new.analysis_session_id;
    if v_parent_run_number is null or v_parent_run_number >= new.run_number then
      raise exception using errcode = '23514', message = 'parent run must be an earlier run in the same session';
    end if;
  end if;
  if tg_op = 'UPDATE' and new.run_number <> old.run_number and exists (
    select 1 from public.analysis_runs child
      where child.parent_run_id = old.id and child.analysis_session_id = old.analysis_session_id
        and child.run_number <= new.run_number
  ) then
    raise exception using errcode = '23514', message = 'run number cannot invalidate child run lineage';
  end if;
  return new;
end;
$$;
create trigger analysis_runs_lineage_guard
  before insert or update
  on public.analysis_runs for each row execute function private.check_analysis_run_lineage();

create table public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  obligation_id uuid not null,
  evidence_type text not null check (length(btrim(evidence_type)) > 0),
  source_reference text,
  row_reference jsonb,
  value jsonb,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (obligation_id, analysis_session_id)
    references public.proof_obligations(id, analysis_session_id) on delete cascade
);

create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null unique references public.analysis_runs(id) on delete cascade,
  result jsonb not null check (jsonb_typeof(result) = 'object'),
  created_at timestamptz not null default now()
);

create table public.stability_tests (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  perturbation_type text not null,
  parameters jsonb not null default '{}'::jsonb check (jsonb_typeof(parameters) = 'object'),
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  sensitivity public.sensitivity_level not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create table public.interpretation_tests (
  id uuid primary key default gen_random_uuid(),
  analysis_run_id uuid not null references public.analysis_runs(id) on delete cascade,
  interpretation text not null,
  result jsonb not null default '{}'::jsonb check (jsonb_typeof(result) = 'object'),
  invariant boolean not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now()
);

create table public.repair_plans (
  id uuid primary key default gen_random_uuid(),
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  failed_obligation_id uuid not null,
  source_run_id uuid not null,
  resulting_run_id uuid,
  failure_reason text not null,
  repair_steps jsonb not null default '[]'::jsonb check (jsonb_typeof(repair_steps) = 'array'),
  status public.repair_plan_status not null default 'PLANNED',
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  check (completed_at is null or completed_at >= created_at),
  foreign key (failed_obligation_id, analysis_session_id)
    references public.proof_obligations(id, analysis_session_id) on delete restrict,
  foreign key (source_run_id, analysis_session_id)
    references public.analysis_runs(id, analysis_session_id) on delete restrict,
  foreign key (resulting_run_id, analysis_session_id)
    references public.analysis_runs(id, analysis_session_id) on delete restrict
);

create table public.verdicts (
  id uuid primary key default gen_random_uuid(),
  analysis_session_id uuid not null references public.analysis_sessions(id) on delete cascade,
  analysis_run_id uuid not null,
  verdict public.verdict_type not null,
  support_score numeric(5,2) check (support_score between 0 and 100),
  passed_obligations jsonb not null default '[]'::jsonb check (jsonb_typeof(passed_obligations) = 'array'),
  failed_obligations jsonb not null default '[]'::jsonb check (jsonb_typeof(failed_obligations) = 'array'),
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (analysis_run_id, analysis_session_id)
    references public.analysis_runs(id, analysis_session_id) on delete restrict
);

-- Ownership predicates are private, fixed-search-path SECURITY DEFINER functions.
create or replace function private.owns_project(p_project_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.projects p
    where p.id = p_project_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_dataset(p_dataset_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.datasets d join public.projects p on p.id = d.project_id
    where d.id = p_dataset_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_question(p_question_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.questions q join public.projects p on p.id = q.project_id
    where q.id = p_question_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_claim(p_claim_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.claims c join public.questions q on q.id = c.question_id
    join public.projects p on p.id = q.project_id
    where c.id = p_claim_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_session(p_session_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.analysis_sessions s join public.claims c on c.id = s.claim_id
    join public.questions q on q.id = c.question_id join public.projects p on p.id = q.project_id
    where s.id = p_session_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_run(p_run_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.analysis_runs r join public.analysis_sessions s on s.id = r.analysis_session_id
    join public.claims c on c.id = s.claim_id join public.questions q on q.id = c.question_id
    join public.projects p on p.id = q.project_id
    where r.id = p_run_id and p.owner_id = (select auth.uid()));
$$;
create or replace function private.owns_dataset_path(p_project_id text, p_dataset_id text, p_object_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.datasets d join public.projects p on p.id = d.project_id
    where p.id::text = p_project_id and d.id::text = p_dataset_id
      and d.storage_path = p_object_path and p.owner_id = (select auth.uid()));
$$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- All application tables use ownership traced to projects. No DELETE policies are defined;
-- verification history tables are therefore append-only to authenticated users.
do $$
declare p record;
begin
  for p in select * from (values
    ('projects','private.owns_project(id)'),
    ('datasets','private.owns_project(project_id)'),
    ('dataset_profiles','private.owns_dataset(dataset_id)'),
    ('questions','private.owns_project(project_id)'),
    ('claims','private.owns_question(question_id)'),
    ('analysis_sessions','private.owns_claim(claim_id)'),
    ('proof_obligations','private.owns_session(analysis_session_id)'),
    ('evidence_items','private.owns_session(analysis_session_id)'),
    ('analysis_runs','private.owns_session(analysis_session_id)'),
    ('analysis_results','private.owns_run(analysis_run_id)'),
    ('stability_tests','private.owns_run(analysis_run_id)'),
    ('interpretation_tests','private.owns_run(analysis_run_id)'),
    ('repair_plans','private.owns_session(analysis_session_id)'),
    ('verdicts','private.owns_session(analysis_session_id)')
  ) as policies(table_name, predicate)
  loop
    execute format('alter table public.%I enable row level security', p.table_name);
    if p.table_name = 'projects' then
      execute 'create policy projects_select_owned on public.projects for select to authenticated using (owner_id = (select auth.uid()))';
      execute 'create policy projects_insert_owned on public.projects for insert to authenticated with check (owner_id = (select auth.uid()))';
      execute 'create policy projects_update_owned on public.projects for update to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))';
    else
      execute format('create policy %I on public.%I for select to authenticated using (%s)', p.table_name || '_select_owned', p.table_name, p.predicate);
    end if;
    if p.table_name in ('analysis_results', 'stability_tests', 'interpretation_tests', 'verdicts') then
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)', p.table_name || '_insert_owned', p.table_name, p.predicate);
    elsif p.table_name <> 'projects' then
      execute format('create policy %I on public.%I for insert to authenticated with check (%s)', p.table_name || '_insert_owned', p.table_name, p.predicate);
      execute format('create policy %I on public.%I for update to authenticated using (%s) with check (%s)', p.table_name || '_update_owned', p.table_name, p.predicate, p.predicate);
    end if;
  end loop;
end $$;

revoke all on public.projects, public.datasets, public.dataset_profiles, public.questions,
  public.claims, public.analysis_sessions, public.proof_obligations, public.evidence_items,
  public.analysis_runs, public.analysis_results, public.stability_tests,
  public.interpretation_tests, public.repair_plans, public.verdicts
  from anon, authenticated;
grant select, insert, update on
  public.projects, public.dataset_profiles, public.questions, public.claims,
  public.analysis_sessions, public.proof_obligations, public.evidence_items,
  public.repair_plans to authenticated;
grant update (name, status, updated_at) on public.datasets to authenticated;
grant update (status, started_at, completed_at) on public.analysis_runs to authenticated;
grant select, insert on public.datasets, public.analysis_runs to authenticated;
grant select, insert on public.analysis_results, public.stability_tests,
  public.interpretation_tests, public.verdicts to authenticated;

create index datasets_project_id_idx on public.datasets(project_id);
create index questions_project_id_idx on public.questions(project_id);
create index questions_dataset_id_idx on public.questions(dataset_id);
create index claims_question_id_idx on public.claims(question_id);
create index analysis_sessions_claim_id_idx on public.analysis_sessions(claim_id);
create index analysis_sessions_current_run_id_idx on public.analysis_sessions(current_run_id);
create index proof_obligations_analysis_session_id_idx on public.proof_obligations(analysis_session_id);
create index analysis_runs_analysis_session_id_idx on public.analysis_runs(analysis_session_id);
create index analysis_runs_parent_run_id_idx on public.analysis_runs(parent_run_id);
create index evidence_items_analysis_session_id_idx on public.evidence_items(analysis_session_id);
create index evidence_items_obligation_id_idx on public.evidence_items(obligation_id);
create index stability_tests_analysis_run_id_idx on public.stability_tests(analysis_run_id);
create index interpretation_tests_analysis_run_id_idx on public.interpretation_tests(analysis_run_id);
create index repair_plans_analysis_session_id_idx on public.repair_plans(analysis_session_id);
create index repair_plans_failed_obligation_id_idx on public.repair_plans(failed_obligation_id);
create index repair_plans_source_run_id_idx on public.repair_plans(source_run_id);
create index repair_plans_resulting_run_id_idx on public.repair_plans(resulting_run_id);
create index verdicts_analysis_session_id_idx on public.verdicts(analysis_session_id);
create index verdicts_analysis_run_id_idx on public.verdicts(analysis_run_id);

insert into storage.buckets (id, name, public, file_size_limit)
values ('veriproof-datasets', 'veriproof-datasets', false, 524288000)
on conflict (id) do update set public = false;

create policy veriproof_dataset_objects_select on storage.objects
  for select to authenticated using (
    bucket_id = 'veriproof-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.owns_dataset_path((storage.foldername(name))[2], (storage.foldername(name))[3], name)
  );
create policy veriproof_dataset_objects_insert on storage.objects
  for insert to authenticated with check (
    bucket_id = 'veriproof-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.owns_dataset_path((storage.foldername(name))[2], (storage.foldername(name))[3], name)
  );
create policy veriproof_dataset_objects_update on storage.objects
  for update to authenticated using (
    bucket_id = 'veriproof-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.owns_dataset_path((storage.foldername(name))[2], (storage.foldername(name))[3], name)
  ) with check (
    bucket_id = 'veriproof-datasets'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and private.owns_dataset_path((storage.foldername(name))[2], (storage.foldername(name))[3], name)
  );
