# Privacy · what HeMoSo stores and where

HeMoSo is a demo and a prototype. Every person and value in the repository, the
demo and Supabase is synthetic; the interface must label the data as synthetic
(REQ-14). This is
[REQ-14](requirements.md): health data is private, and no real personal data
belongs in the repository or the app.

## What the app holds

Each measurement is one row with a person id, an indicator, a value, a unit, a
mission day and a time. The exact columns and their format are in
[../FORMATS.md](../FORMATS.md), which also names the synthetic demo data files.
No measurement belongs to a real person.

## Where keys live

The app must store data in Supabase and run on Vercel and a backend host
([DECISIONS.md](DECISIONS.md), [DEPLOY.md](DEPLOY.md)). The keys for those
services live only in two places:

- a local `.env` file on each engineer's machine, never in the repository;
- the hosts' own settings (Vercel environment variables and the backend host).

`.env.example` must list the names with empty values so a new machine knows what to
fill in; it must carry no keys. `.gitignore` keeps every `.env` file out except
that example.

## If a key is committed

A key that reaches the repository is exposed, and removing the commit does not
make it secret again: the history keeps it. Act in this order:

1. Rotate the key in Supabase first: create a new key, revoke the old one.
2. Then remove the key from the file and commit the removal.
3. Put the new key in the host settings and in your local `.env`.

`python scripts/precheck.py` blocks `.env` files and key material before a push;
these steps are the fallback for anything that slips through.

## Links

- [REQ-14](requirements.md): treat health data as private; no real personal data.
- [DEPLOY.md](DEPLOY.md): how the app is published.
