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

-- Pain reports from the 3D body (B-3). This block stands alone too: it does not
-- touch entries or accounts, so a project that already ran those blocks can run
-- only this one. `intensity` is the 0 to 10 the astronaut set; the API stores it
-- and never reads it as a sign of anything.
create table if not exists pain_reports (
    person_id text not null,
    region_id text not null,
    intensity integer not null check (intensity between 0 and 10),
    mission_day integer not null,
    time text not null,
    note text,
    created_at timestamptz not null default now()
);

-- Natural key: one report per person, region, day and time, so the frontend's
-- outbox can re-send a report without adding a second row.
create unique index if not exists pain_reports_natural_key_idx
    on pain_reports (person_id, region_id, mission_day, time);

create index if not exists pain_reports_person_idx
    on pain_reports (person_id, mission_day, time);

-- As with the two tables above: no policy, so only the service role key reaches
-- the rows and the anon key reads nothing.
alter table pain_reports enable row level security;

-- Mission start per account (REQ-37): each astronaut's date, the one Flight Day
-- 1 is counted from. This block stands alone too, and only adds a column: the
-- accounts already in the table keep their rows and read with a null date.
alter table accounts add column if not exists mission_start date;
