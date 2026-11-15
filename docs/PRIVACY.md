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

## Data kept on the device

The frontend saves the astronaut's entries in the browser, one local storage
key, `hemoso:v2` (`frontend/src/data/storedState.ts`). It holds:

- the entries: person id, indicator id, value, unit, mission day, time and the
  app's id for the row (`frontend/src/domain/types.ts`);
- the ids waiting to be sent, the ids the server refused, and the mission time
  of the last send.

On the first run the key is written with the demo rows from
`config/data/demo_data.csv` and an empty waiting list
(`frontend/src/data/entryStore.ts`). Every later save rewrites the same key.

A sent entry stays on the device: a request the server accepts only takes its id
out of the waiting list, so the History tab keeps its readings. An entry the
server refuses with 409 or 422 leaves the waiting list for good and stays in the
entries.

Every value there is synthetic in the demo, as everywhere else (REQ-14). The app
sets no cookie, uses no session storage and opens no database: this key is the
only thing it keeps (`frontend/src/data/`).

When the browser blocks storage, the app works from memory for that tab and the
screen says the entries are not saved on this device. When a stored payload
cannot be read, the app replaces it with the demo rows and says so.

To remove what a device holds, clear the site data for the app's address,
local storage included; the next visit starts again from the demo rows. Clearing
it also matters on a shared browser: the person picker lists the people whose
entries are stored there (`frontend/src/App.tsx`), so the entries of an earlier
session stay visible until the site data is cleared.

## Where keys live

The app must store data in Supabase and run on Vercel and a backend host
([DECISIONS.md](DECISIONS.md), [DEPLOY.md](DEPLOY.md)). The keys for those
services live only in two places:

- a local `.env` file on each engineer's machine, never in the repository;
- the hosts' own settings (Vercel environment variables and the backend host).

`.env.example` must list the names with empty values so a new machine knows what to
fill in; it must carry no keys. `.gitignore` keeps every `.env` file out except
that example.

## Supabase access

The backend holds the Supabase service role key, which bypasses row level
security, so the `entries` table has RLS on with no policies and only the
backend can reach it. The `accounts` table follows the same rule.

## Accounts and sessions

A person may create an account with a username and a PIN of 4 to 8 digits
(REQ-37, [DECISIONS.md](DECISIONS.md)). The backend stores only the person id, a
random 16-byte salt and the scrypt hash of the PIN, in the `accounts` table of
Supabase (or SQLite, or memory in tests). The PIN is never stored, logged or
returned, and the browser never keeps it.

Signing in returns a session token signed with `SESSION_SECRET`, valid for 30
days. The server keeps no copy of the token; the browser keeps it per person
until sign-out or expiry. `SESSION_SECRET` lives only in the backend host's
settings, empty in `.env.example`; without it the backend makes a random one at
start, so tokens stop working after a restart.

The routes of a person with an account refuse requests without that person's
token. The synthetic demo astronaut has no account, so the demo opens with no
login (REQ-32). The face data of face sign-in never leaves the device (REQ-36):
the face only unlocks a session already stored on that device.

## Eye check (optional, off by default)

The eye check is an add-on behind the `EYE_CHECK_ENABLED` flag and is off until
the team turns it on. It runs only when the person starts it. The camera opens,
and each frame is read on the device to measure how far the eyes are closed and
how often they blink. No frame, image or video is stored or sent. The camera is
released when the check ends or on Escape.

Only two numbers are saved, `eye_closure_pct` and `blink_rate_pm`, as readings
like any other: they go to the device store and through the same outbox. The
check never reads mood, stress or emotion from the face, and it never labels the
person ([phys-07](findings/phys-07-eye-closure-check.md)).

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
