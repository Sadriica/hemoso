# Submission checklist (REQ-23, T-15)

Sun 15 Nov 06:35. Run this before pressing Submit for Judging.

## 1. Links (all must open with no login)

| Item | Link | Checked |
| --- | --- | --- |
| Live app | https://www.hemoso.space/ | Yes, 06:30: loads, no console errors, "open the demo" works |
| Repository | https://github.com/Sadriica/hemoso | Yes, public |
| Demo (30 s video) | **missing** | Bio 1 and Eng 2 |
| Team page | https://www.spaceappschallenge.org/2026/find-a-team/tardis2/ | Yes |

## 2. Claims in the page that must match `main`

Ask Eng 2 to confirm each one; if it is not in `main`, move it to "planned".

- [ ] Twelve indicators recorded, with unit and how each is measured in flight.
- [ ] The app compares against the person's own last 14 readings (median and spread).
- [ ] Four states, and the state names who acts: crew, CMO, flight surgeon.
- [ ] A next step in plain words for each state.
- [ ] Possible conditions as an evidence score, never a percentage.
- [ ] Works offline, with an outbox for what could not be sent.
- [ ] Synthetic data, labelled in the interface.

## 2b. The demo card has no probability number

The app shows an evidence score from 0 to 1 with the signals behind it, never a
percentage. The script and the video say "a probability and its basis"; that is
the line to keep. Do not add a number, and do not ask Bio 2 for one. If the
script's TODO still says "the real probability from Bio 2", replace it with
"the evidence score and its basis".

## 3. English (REQ-16)

- [ ] Page, app and video in English, or the video subtitled in English.
- Checked at 06:30: no Spanish characters in `frontend/src/strings.ts` or in
  `config/`.

## 4. AI disclosure (REQ-20)

- [ ] The page answers the SI question with the text in `SI-USE.md`.
- [ ] No AI-generated image or video, so no watermark is needed; if one is added,
      it needs a visible watermark and no NASA branding.
- [ ] The five `team/*/LOG.md` have their `AI used` rows; `SI-USE.md` is
      regenerated with `python scripts/si_use.py`.

## 5. Data and privacy (REQ-14)

- [ ] Every value in the app and the database is synthetic; the interface says so.
- [ ] No real personal health data anywhere in the repository.

## 6. NASA data (REQ-19)

- [ ] At least one NASA data or resource named on the page (there are nine, in
      `submission/submission.md`).
- [ ] Every other data source, tool, code and image listed with its licence.

## 7. The submission itself (REQ-23)

- [ ] Page fields copied from `submission/submission.md`, all of them filled.
- [ ] "Terms and Conditions" checked.
- [ ] "Confirm All Work is Original" checked.
- [ ] "Submit for Judging" pressed **before 13:30**, internal freeze.
- [ ] Screenshot of the confirmation kept, with the time.

## 8. After submitting

- [ ] Time and confirmation recorded in `team/bio2/LOG.md`.
- [ ] The team told, with the link to the submitted project.
