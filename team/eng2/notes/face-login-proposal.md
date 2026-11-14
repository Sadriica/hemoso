# Proposal · sign in with the face (frontend only)

Juli's request, Sat 14 16:45. For Eng 1 to add to `docs/requirements.md` and
the board (requirements are his file); the frontend tasks are T-58 and T-59 in
`team/eng2/notes/frontend-tasks.csv`. Frontend only: no backend, no server, no
cloud service.

## Proposed requirement (docs/requirements.md format)
| ID | Requirement | Class | Priority | Owner | Block | Done when |
| --- | --- | --- | --- | --- | --- | --- |
| REQ-36 (number for Eng 1 to set) | Sign in with the face, on the device only | optional | P2 | Juli (@julimejia) | B3 Sat 17-1 | A person can register their face once and then sign in by looking at the camera; matching runs in the browser with bundled models; no image or face data leaves the device; the person picker still works without a camera |

Optional consideration it serves: camera input (the statement lists camera
images as another way to enter data; `docs/DECISIONS.md` already records the
camera as part of the team's solution).

## Blocker: REQ-14 needs a written exception first
REQ-14's done-when says "No real personal data in the repository or the app".
A real team member's face descriptor in the browser is real biometric data in
the app, so as REQ-14 is written today, T-58 breaks it. T-58 does not start
until Eng 1 (owner of REQ-14) records one of these in `docs/DECISIONS.md`:
- **Use, with an exception:** real data allowed only for face sign-in, only
  on the device that took it, deletable by the person, never committed, sent,
  logged or put in screenshots other than the demo video with the person's
  agreement. REQ-14's done-when is updated to name the exception.
- **Rejected:** face sign-in stays out of the product.

Without that row, Bio 2's REQ-10 review can fail the checkpoint.

## How it works
| Step | What happens | Where the data stays |
| --- | --- | --- |
| Consent | Before the camera opens, a short text says what is stored and that nothing is sent | — |
| Register | The camera takes a few frames; the model turns the face into a list of 128 numbers (a face descriptor); the average is stored with the person id | `localStorage` on this device only; no image is kept |
| Sign in | One look at the camera; the new descriptor is compared with the stored ones; the closest under the distance threshold selects that person | In memory; the frame is dropped at once |
| Forget | "Delete my face data" removes the stored descriptor | — |
| No camera | The person picker stays, so the app works with the camera denied, missing, or by keyboard only (REQ-15) | — |

## Rules it keeps
- `docs/STACK.md` rule 4 (no cloud vision) and rule 5 (nothing from a CDN):
  `@vladmandic/face-api` 1.7.15 (MIT) runs in the browser; its model files are
  served from `frontend/public/models/` on the same site, with their licence.
  The face module and the models load only when someone opens "Sign in with
  face", so the main page stays small.
- Privacy (REQ-14): the descriptor is biometric data of a real person. It never
  leaves the browser, is never committed, never sent to the API, and can be
  deleted. The demo uses an adult team member who agrees to it; nobody under
  18 (REQ-22).
- Honest scope: this is a quick way to pick the person on a shared device, not
  a security control. A photo can fool it. The README and the consent text say
  so.

## Costs and priority
- `@vladmandic/face-api` 1.7.15 is its last release (5 Feb 2025) and unpacks
  to about 23.6 MB with TensorFlow.js; only the three model files are copied
  and the module loads on demand, but the first sign-in downloads several MB.
- Offline sign-in needs the models cached by the service worker (T-48);
  without it, the person picker is the fallback.
- It is P2. REQ-31 (demo video) and REQ-32 (public link) are P0 and due Sunday
  morning, so T-58 runs only after those are safe.

## For Eng 1
- Decide the REQ-14 exception above and record it in `docs/DECISIONS.md`.
- Add the requirement, with its number, to `docs/requirements.md` and the board.
- One row in `docs/DECISIONS.md` for `@vladmandic/face-api` 1.7.15 (MIT) and its model files.
