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
    created_at timestamptz not null default now()
);

create index entries_person_indicator_idx on entries (person_id, indicator_id);

alter table entries enable row level security;
