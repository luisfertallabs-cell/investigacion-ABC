-- Investigación ABC: esquema inicial
-- Plataforma de investigación para residentes de cirugía.

create extension if not exists pgcrypto;

-- Catálogos ----------------------------------------------------------------

create table public.specialties (
  id          smallint generated always as identity primary key,
  name        text not null,
  parent_id   smallint references public.specialties(id) on delete cascade,
  position    smallint not null default 0,
  unique (name, parent_id)
);
comment on table public.specialties is 'Especialidades (parent_id nulo) y subespecialidades (parent_id = especialidad).';

-- Perfiles -----------------------------------------------------------------

create type public.user_role as enum ('residente', 'coordinador');
create type public.gender as enum ('femenino', 'masculino', 'no_binario', 'prefiero_no_decir');

create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  full_name       text not null default '',
  gender          public.gender,
  birth_date      date,
  specialty_id    smallint references public.specialties(id),
  subspecialty_id smallint references public.specialties(id),
  residency_year  smallint check (residency_year between 1 and 8),
  role            public.user_role not null default 'residente',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create or replace function public.is_coordinator()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'coordinador');
$$;

-- Crea el perfil a partir de los metadatos enviados en signUp.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (id, full_name, gender, birth_date, specialty_id, subspecialty_id, residency_year)
  values (
    new.id,
    coalesce(m->>'full_name', ''),
    nullif(m->>'gender', '')::public.gender,
    nullif(m->>'birth_date', '')::date,
    nullif(m->>'specialty_id', '')::smallint,
    nullif(m->>'subspecialty_id', '')::smallint,
    nullif(m->>'residency_year', '')::smallint
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Solo un coordinador puede cambiar roles.
-- auth.uid() nulo = SQL Editor o service role (confiables); anon no tiene política de update.
create or replace function public.guard_profile_role()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_coordinator() then
    raise exception 'Sin permiso para cambiar el rol';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function public.guard_profile_role();

-- Proyectos (artículos) ------------------------------------------------------

create type public.project_status as enum ('abierto', 'en_curso', 'cerrado');
create type public.member_status as enum ('invitado', 'solicitado', 'aceptado', 'rechazado');

create table public.congresses (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  acronym            text,
  society            text,
  specialty_id       smallint references public.specialties(id),
  city               text,
  country            text,
  start_date         date,
  end_date           date,
  abstract_deadline  date,
  url                text,
  confirmed          boolean not null default true,
  created_by         uuid references public.profiles(id) default auth.uid(),
  created_at         timestamptz not null default now()
);

create table public.projects (
  id                uuid primary key default gen_random_uuid(),
  title             text not null,
  summary           text not null default '',
  design            text,
  specialty_id      smallint references public.specialties(id),
  congress_id       uuid references public.congresses(id) on delete set null,
  target_n          integer check (target_n > 0),
  status            public.project_status not null default 'abierto',
  created_by        uuid references public.profiles(id) default auth.uid(),
  created_at        timestamptz not null default now()
);

create table public.project_members (
  project_id    uuid not null references public.projects(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  status        public.member_status not null,
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  primary key (project_id, user_id)
);

create or replace function public.is_member(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.project_members
    where project_id = p and user_id = auth.uid() and status = 'aceptado'
  );
$$;

create or replace function public.has_any_link(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.project_members where project_id = p and user_id = auth.uid());
$$;

-- Variables definidas por el coordinador para cada base de datos.
create type public.variable_type as enum ('texto', 'numero', 'entero', 'fecha', 'si_no', 'opcion', 'multiple');

create table public.project_variables (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.projects(id) on delete cascade,
  key         text not null check (key ~ '^[a-z][a-z0-9_]*$'),
  label       text not null,
  type        public.variable_type not null default 'texto',
  options     text[] not null default '{}',
  unit        text,
  required    boolean not null default false,
  position    integer not null default 0,
  unique (project_id, key)
);

-- Plan de trabajo: pasos con fecha límite.
create table public.project_tasks (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  due_date     date not null,
  assignee_id  uuid references public.profiles(id) on delete set null,
  position     integer not null default 0,
  done_at      timestamptz,
  done_by      uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Registros de pacientes (sin datos identificables).
create table public.records (
  id           uuid primary key default gen_random_uuid(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  folio        text not null,
  data         jsonb not null default '{}'::jsonb,
  created_by   uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (project_id, folio)
);

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

-- Evita suplantar autoría o mover registros entre proyectos.
create or replace function public.guard_record()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := coalesce(auth.uid(), new.created_by);
  elsif new.project_id is distinct from old.project_id or new.created_by is distinct from old.created_by then
    raise exception 'No se puede cambiar proyecto ni autor del registro';
  end if;
  return new;
end;
$$;

create trigger records_guard before insert or update on public.records
  for each row execute function public.guard_record();

create trigger records_touch before update on public.records
  for each row execute function public.touch_updated_at();

-- Los integrantes solo pueden marcar tareas como hechas, no editar su contenido.
create or replace function public.guard_task_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_coordinator() then
    return new;
  end if;
  if new.title is distinct from old.title
     or new.description is distinct from old.description
     or new.due_date is distinct from old.due_date
     or new.assignee_id is distinct from old.assignee_id
     or new.project_id is distinct from old.project_id
     or new.position is distinct from old.position then
    raise exception 'Solo el coordinador puede editar la tarea';
  end if;
  new.done_by := case when new.done_at is null then null else auth.uid() end;
  return new;
end;
$$;

create trigger project_tasks_guard before update on public.project_tasks
  for each row execute function public.guard_task_update();

-- Un residente solo puede responder su invitación o retirar su solicitud.
create or replace function public.guard_member_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() is null or public.is_coordinator() then
    new.responded_at := coalesce(new.responded_at, now());
    return new;
  end if;
  if old.user_id <> auth.uid() or new.user_id <> old.user_id or new.project_id <> old.project_id then
    raise exception 'Sin permiso';
  end if;
  if not (old.status = 'invitado' and new.status in ('aceptado', 'rechazado')) then
    raise exception 'Cambio de estado no permitido';
  end if;
  new.responded_at := now();
  return new;
end;
$$;

create trigger project_members_guard before update on public.project_members
  for each row execute function public.guard_member_update();

-- Índices -------------------------------------------------------------------

create index on public.project_members (user_id);
create index on public.project_tasks (project_id, due_date);
create index on public.project_tasks (assignee_id);
create index on public.records (project_id);
create index on public.project_variables (project_id, position);
create index on public.congresses (start_date);

-- RLS ------------------------------------------------------------------------

alter table public.specialties       enable row level security;
alter table public.profiles          enable row level security;
alter table public.congresses        enable row level security;
alter table public.projects          enable row level security;
alter table public.project_members   enable row level security;
alter table public.project_variables enable row level security;
alter table public.project_tasks     enable row level security;
alter table public.records           enable row level security;

-- Catálogo visible incluso antes de iniciar sesión (formulario de registro).
create policy specialties_read on public.specialties for select to anon, authenticated using (true);
create policy specialties_write on public.specialties for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

-- Datos sensibles (género, fecha de nacimiento) solo para el titular y coordinadores.
create policy profiles_read on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_coordinator());
create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_coordinator())
  with check (id = auth.uid() or public.is_coordinator());

create policy congresses_read on public.congresses for select to authenticated using (true);
create policy congresses_write on public.congresses for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy projects_read on public.projects for select to authenticated
  using (public.is_coordinator() or status = 'abierto' or public.has_any_link(id));
create policy projects_write on public.projects for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy members_read on public.project_members for select to authenticated
  using (user_id = auth.uid() or public.is_coordinator() or public.is_member(project_id));
create policy members_insert on public.project_members for insert to authenticated
  with check (
    public.is_coordinator()
    or (user_id = auth.uid() and status = 'solicitado'
        and exists (select 1 from public.projects p where p.id = project_id and p.status = 'abierto'))
  );
create policy members_update on public.project_members for update to authenticated
  using (user_id = auth.uid() or public.is_coordinator())
  with check (user_id = auth.uid() or public.is_coordinator());
create policy members_delete on public.project_members for delete to authenticated
  using (public.is_coordinator() or (user_id = auth.uid() and status = 'solicitado'));

create policy variables_read on public.project_variables for select to authenticated
  using (public.is_coordinator() or public.has_any_link(project_id)
         or exists (select 1 from public.projects p where p.id = project_id and p.status = 'abierto'));
create policy variables_write on public.project_variables for all to authenticated
  using (public.is_coordinator()) with check (public.is_coordinator());

create policy tasks_read on public.project_tasks for select to authenticated
  using (public.is_coordinator() or public.is_member(project_id));
create policy tasks_write on public.project_tasks for insert to authenticated
  with check (public.is_coordinator());
create policy tasks_update on public.project_tasks for update to authenticated
  using (public.is_coordinator() or public.is_member(project_id))
  with check (public.is_coordinator() or public.is_member(project_id));
create policy tasks_delete on public.project_tasks for delete to authenticated
  using (public.is_coordinator());

create policy records_read on public.records for select to authenticated
  using (public.is_coordinator() or public.is_member(project_id));
create policy records_insert on public.records for insert to authenticated
  with check (public.is_coordinator() or public.is_member(project_id));
create policy records_update on public.records for update to authenticated
  using (public.is_coordinator() or public.is_member(project_id))
  with check (public.is_coordinator() or public.is_member(project_id));
create policy records_delete on public.records for delete to authenticated
  using (public.is_coordinator() or (created_by = auth.uid() and public.is_member(project_id)));

-- Directorio sin datos sensibles: nombre, especialidad, año y rol.
-- Permite ver integrantes de proyectos sin exponer género ni fecha de nacimiento.
create or replace function public.directory()
returns table (id uuid, full_name text, specialty_id smallint, subspecialty_id smallint, residency_year smallint, role public.user_role)
language sql stable security definer set search_path = public
as $$
  select p.id, p.full_name, p.specialty_id, p.subspecialty_id, p.residency_year, p.role
  from public.profiles p
  where auth.uid() is not null
  order by p.full_name;
$$;

-- Permisos de ejecución: solo usuarios autenticados.
revoke execute on function public.directory() from public, anon;
grant execute on function public.directory() to authenticated;
revoke execute on function public.is_coordinator() from public, anon;
grant execute on function public.is_coordinator() to authenticated;
revoke execute on function public.is_member(uuid) from public, anon;
grant execute on function public.is_member(uuid) to authenticated;
revoke execute on function public.has_any_link(uuid) from public, anon;
grant execute on function public.has_any_link(uuid) to authenticated;
revoke execute on function public.handle_new_user() from public, anon, authenticated;
