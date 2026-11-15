-- HeMoSo entries table. Run this in the Supabase SQL editor
-- (Dashboard -> SQL editor -> New query) once per project.
create table entries (
    id bigint generated always as identity primary key,
    person_id text not null,
    indicator_id text not null,
    value double precision not null,
    unit text not null,
    mission_day integer not null,
    time text not null,
    context text not null default 'rest',
    created_at timestamptz not null default now()
);

create index entries_person_indicator_idx on entries (person_id, indicator_id);

-- Natural key (REQ-13): one entry per person, indicator, day and time.
-- Delete duplicates first (keep the lowest id per key): required only on a
-- project that already ran the create table above, a no-op on a fresh one.
delete from entries
where id not in (
    select min(id) from entries
    group by person_id, indicator_id, mission_day, time
);

-- A project that already ran the create table above needs the context column;
-- this is a no-op on a fresh one where the column is part of the create table.
alter table entries add column if not exists context text not null default 'rest';

alter table entries add constraint entries_natural_key_unique
    unique (person_id, indicator_id, mission_day, time);

alter table entries enable row level security;

-- Accounts (REQ-37). This block stands alone: it does not touch entries, so a
-- project that already ran the block above can run only this one.
create table if not exists accounts (
    person_id text primary key,
    salt text not null,
    pin_hash text not null,
    created_at timestamptz not null default now()
);

-- The API reads and writes accounts with the service role key, which bypasses
-- row level security; without a policy the anon key can read nothing.
alter table accounts enable row level security;
