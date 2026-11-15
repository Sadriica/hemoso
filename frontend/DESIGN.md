# DESIGN.md · HeMoSo "Observatory"

Locked Sat 14 Nov 2026. This is the single source for the
look of the frontend. `src/theme/tokens.ts`, `src/styles.css` and
`src/phases.css` read the same values; `src/theme.test.ts` fails when a colour
pair drops under WCAG AA or when `tokens.ts` and `styles.css` disagree. It
replaces `frontend/sdd/style-guide.md`, which is not in the repository.

Every later visual change cites a token from this file. A value that is not
here is a bug, or a proposal for Eng 1 (Wambi).

## 1. Direction

A futuristic planetarium inside a space mission. Calm, precise, comfortable to
look at for a long time, simple and always functional. The app leads the
astronaut one step at a time (identify, report, status), never a wall of data.
Details open on demand: first the state in words and its icon, then the value,
then the trend, then sources.

Why each reference, and only that:

| Reference | Used for | Not taken |
| --- | --- | --- |
| Eclipse, The Last Frontier (Aksonvady Phomhome, made in Aura) | Navigation: numbered chapters as our phase rail ("01 Identify"). Type: huge uppercase condensed headline on 2 or 3 lines, one sentence, one action with an arrow. Microcopy: mono telemetry line. Colour: near-black blue with bone-white text. Intro: short, skippable. | Its text, images, names, assets, its CDN stack (Three.js, GSAP, Tailwind), its long scroll story, its sound. |

The reference helps with navigation, type, colour and the intro only. Motion
rules are our own (section 7). No logo, flag, patch or mission name; no exact
`#0B3D91` and `#FC3D21`.

## 2. Colour

Dark is the default; light follows the operating system. Hex values below are
the ones in `tokens.ts` and `styles.css`.

### 2.1 Roles

| Token | Role | Dark | Light |
| --- | --- | --- | --- |
| `--color-bg` | Page | `#070B10` | `#F3F4F0` |
| `--color-bg-raised` | Top bar, phase rail | `#0C131D` | `#FFFFFF` |
| `--color-surface` | Cards, panels | `#121B27` | `#FFFFFF` |
| `--color-border` | Decorative 1 px rules (no contrast rule) | `#3A4A5E` | `#C5CDD8` |
| `--color-border-control` | Edge of an input, select, secondary button (3:1) | `#6F8197` | `#6B7A8F` |
| `--color-text` | Body and headlines (bone white in dark) | `#F2F1E9` | `#0B1220` |
| `--color-text-muted` | Labels, metadata | `#A9B3C1` | `#475266` |
| `--color-accent` | Links, selected step, focus ring, second headline line | `#8EC5FF` | `#0B4AA8` |
| `--color-interactive` | Primary button fill | `#2563EB` | `#1D4ED8` |
| `--color-on-interactive` | Text on the primary button | `#FFFFFF` | `#FFFFFF` |
| `--color-signal` | Red-orange: most urgent level and destructive actions only | `#FF6A4D` | `#B82A14` |
| `--color-grid` | Page grid, dark only | `rgb(255 255 255 / 4%)` | transparent |

### 2.2 State colours

State is never colour alone: each state has its own icon shape and its words.

| State (astronaut words) | Icon shape | Text token | Fill token |
| --- | --- | --- | --- |
| In your usual range | circle with check | `--status-in-range-text` `#5FD49A` / `#14532D` | `--status-in-range-bg` `#0D2A1F` / `#DCFCE7` |
| Outside your usual range | open ring with a dot offset to one side | `--status-outside-text` `#8EC5FF` / `#0B4AA8` | `--status-outside-bg` `#0F2339` / `#DBEAFE` |
| Needs review | triangle with a bar | `--status-review-text` `#FF8A70` / `#9A2A14` | `--status-review-bg` `#33140E` / `#FDE4DE` |
| No data yet | dashed ring | `--status-no-data-text` `#A9B3C1` / `#374151` | `--status-no-data-bg` `#18222F` / `#E5E7EB` |
| Field error and warnings | diamond with a bar | `--status-attention-text` `#F5C542` / `#6B3A06` | `--status-attention-bg` `#2C2407` / `#FEF3C7` |

`--color-signal` is the most urgent level and destructive actions only, and
never fills a large area.

### 2.3 Body systems

One colour per system, for the indicator icon, the body silhouette zone and the
planetarium orbit. Always next to the indicator name in words.

| Token | System | Indicators | Dark | Light |
| --- | --- | --- | --- | --- |
| `--system-cardiovascular` | cardiovascular (coral, not the signal red) | `hr_bpm`, `bp_sys_mmhg`, `bp_dia_mmhg` | `#FF7A70` | `#C7352B` |
| `--system-thermoregulation` | thermoregulation (amber) | `temp_core_c` | `#F5A524` | `#A85D00` |
| `--system-sleep` | sleep (indigo) | `sleep_h` | `#9AA5FF` | `#4F46E5` |
| `--system-neuro` | neuro-behavioural (violet) | `mood_1_5` | `#C39BFF` | `#7C3AED` |
| `--system-metabolic` | metabolic (teal) | `glucose_mgdl` | `#3ED1C0` | `#0F766E` |

The respiratory, musculoskeletal and radiation systems have no indicator in the
demo. They have no colour until one exists; propose it to Eng 1 first.

## 3. Contrast grid

Computed from the hex values above with the WCAG 2.2 formula. Text needs 4.5:1,
large text, control edges and icons 3:1. Every row passes; `theme.test.ts`
re-checks them on each test run.

| Foreground | On | Dark | Light | Needs |
| --- | --- | --- | --- | --- |
| Text | page | 17.41 | 16.95 | 4.5:1 |
| Text | raised band | 16.45 | 18.72 | 4.5:1 |
| Text | card | 15.29 | 18.72 | 4.5:1 |
| Muted text | page | 9.31 | 7.13 | 4.5:1 |
| Muted text | card | 8.17 | 7.87 | 4.5:1 |
| Muted text | raised band | 8.79 | 7.87 | 4.5:1 |
| Accent / link / focus ring | page | 10.88 | 7.43 | 4.5:1 |
| Accent / link / focus ring | card | 9.56 | 8.21 | 4.5:1 |
| Button text | interactive fill | 5.17 | 6.70 | 4.5:1 |
| Signal | card | 6.12 | 6.21 | 4.5:1 |
| Signal | page | 6.97 | 5.63 | 4.5:1 |
| In range | in-range badge | 8.31 | 8.30 | 4.5:1 |
| Attention | attention badge | 9.50 | 8.45 | 4.5:1 |
| Needs review | review badge | 7.31 | 6.38 | 4.5:1 |
| No data | no-data badge | 7.57 | 8.33 | 4.5:1 |
| Outside range | outside badge | 8.77 | 6.73 | 4.5:1 |
| Control edge | page | 4.94 | 3.96 | 3:1 |
| Control edge | card | 4.34 | 4.37 | 3:1 |
| Control edge | raised band | 4.67 | 4.37 | 3:1 |
| Interactive fill | page | 3.82 | 6.07 | 3:1 |
| Interactive fill | card | 3.35 | 6.70 | 3:1 |
| Cardiovascular | page | 7.77 | 4.79 | 3:1 |
| Cardiovascular | card | 6.82 | 5.29 | 3:1 |
| Thermoregulation | page | 9.67 | 4.49 | 3:1 |
| Thermoregulation | card | 8.49 | 4.96 | 3:1 |
| Sleep | page | 8.64 | 5.69 | 3:1 |
| Sleep | card | 7.59 | 6.29 | 3:1 |
| Neuro-behavioural | page | 8.88 | 5.16 | 3:1 |
| Neuro-behavioural | card | 7.80 | 5.70 | 3:1 |
| Metabolic | page | 10.42 | 4.95 | 3:1 |
| Metabolic | card | 9.15 | 5.47 | 3:1 |
| In range | card | 9.38 | 9.11 | 3:1 |
| Attention | card | 10.68 | 9.40 | 3:1 |
| Needs review | card | 7.53 | 7.73 | 3:1 |
| Outside range | card | 9.56 | 8.21 | 3:1 |
Any new pair must be added here and to `theme.test.ts` before it is used.

## 4. Type

### 4.1 Families

| Role | Token | Family | Fallback |
| --- | --- | --- | --- |
| Display (headlines, big numbers' labels) | `--font-display` | Barlow Condensed, SIL OFL | Arial Narrow, Roboto Condensed, system-ui |
| Body | `--font-body` | Inter, SIL OFL | system-ui, Segoe UI, Roboto |
| Mono (telemetry, values, labels) | `--font-mono` | JetBrains Mono, SIL OFL | ui-monospace, Cascadia Mono, Consolas |

Font gate: the three families are named in the tokens but no file is bundled
yet. Files are self-hosted from `frontend/public/fonts/` with their licence
file, after Eng 1 says yes and `docs/DECISIONS.md` has a row. No CDN, ever.
Until then the fallbacks show, and the scale below holds with them.

### 4.2 Scale (locked)

| Token | Size / line | Weight | Family | Use |
| --- | --- | --- | --- | --- |
| `hero` | 64 / 60 (44 / 42 under 600 px) | 700 | display, uppercase | The one headline of a phase, over 2 or 3 lines |
| `display` | 40 / 40 (32 / 34) | 700 | display, uppercase | Empty and intro states |
| `h1` | 28 / 36 (24 / 32) | 700 | display | Panel titles |
| `h2` | 22 / 30 (20 / 28) | 600 | display | Card titles |
| `value` | 36 / 40 (30 / 36) | 500 | mono | The number on a card |
| `bodyLarge` | 18 / 28 | 400 | body | The one sentence under a headline |
| `body` | 16 / 24 | 400 | body | Text |
| `small` | 14 / 20 | 400 | body | Secondary text |
| `label` | 12 / 16, tracking `0.08em` | 500 | mono, uppercase | Telemetry line, eyebrow, field label |

Body text never goes under 16 px except `small` (14) and `label` (12, uppercase,
only for metadata that is also available in words elsewhere). No other size
exists. Telemetry microcopy shows real data only: mission day, clock time,
reading context, "last 14 readings", sync state. Never invented numbers.

## 5. Spacing and layout

4 px base. Tokens: `--space-1` 4, `--space-2` 8, `--space-3` 16, `--space-4` 24,
`--space-5` 32, `--space-6` 48, `--space-7` 64. No other spacing value.

Content stops at 1200 px (`--container-width`). Side gutter: 16 px under
600 px, 32 px from 600 px, 64 px from 1024 px. One column at 320 px with no
horizontal scroll. Every target is at least 44 px (`--tap-min`). The page has
at most one primary action per screen.

## 6. Shape and elevation

`--radius-small` 2 px for buttons and badges, `--radius-card` 4 px for cards
and inputs, `--radius-round` for orbit bodies and dots. Depth comes from
surface steps (`bg` to `bg-raised` to `surface`) and 1 px borders; only an open
panel over content uses `--shadow-raised`. Where text sits on the Starfield it
sits on a solid `--color-surface` or `--color-bg-raised`, never on the stars.

## 7. Motion

| Token | Value | Use |
| --- | --- | --- |
| `--motion-fast` | 150 ms | Hover, focus, press |
| `--motion-base` | 250 ms | Icon pulse, value counting up, card entering, chart drawing |
| `--motion-slow` | 400 ms | Instrument settling, rail progress, headline rise |
| `--motion-cinematic` | 1200 ms | Intro, phase change, planetarium settling; the only steps over 600 ms |
| `--ease-standard` | `cubic-bezier(0.2, 0.7, 0.1, 1)` | Things entering |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Fades and transitions |

Rules:
- A state change animates in 150 to 400 ms, never over 600 ms. Motion shows a
  change of state; it never decorates.
- Cinematic moments (first load, phase change, planetarium settling) never
  block input, last at most 1.2 s, and skip with any key or tap.
- The Starfield drifts slowly and is the only ambient motion.
- Everything stops under `prefers-reduced-motion` and with the top bar switch
  (class `app--still`); the app is complete without motion. Animate only
  `transform`, `opacity` and SVG stroke offsets.
- The 30-second demo path never waits on an animation.
- No sound.

## 8. Components

- **Card.** `--color-surface`, `--border-subtle`, `--radius-card`, padding
  `--space-4` (`--space-3` under 600 px). Reading order inside: indicator name
  with its system icon, state badge (icon + words), value and unit, trend
  against "your last 14 readings", one next step. Details open on demand.
- **State badge.** `--radius-small`, mono `label`, state icon shape (2.2) before
  the words, text and fill from the state tokens.
- **Button.** Primary: `--color-interactive` fill, `--color-on-interactive`
  text, mono `label` uppercase, one arrow glyph, min height 44 px. Secondary:
  transparent, `--color-border-control` edge. Destructive: `--color-signal`
  text and edge. One primary per screen.
- **Input and select.** `--color-border-control` edge, `--radius-card`, unit
  visible as a suffix inside the field, label above, error text with the
  attention icon under the field.
- **Phase rail.** Fixed at the bottom on `--color-bg-raised`: "01 Identify",
  "02 Report", "03 Status", current step in `--color-accent`, a progress line,
  `aria-current="step"`. It says where the astronaut is and what comes next.
- **Top bar.** Logo, mission day and clock, who is on duty, sync state, the
  motion switch. The synthetic-data notice stays visible on every phase.
- **Chart.** Same tokens as the cards: line in `--color-accent`, the median
  dashed in `--color-text-muted`, points drawn as shapes, a table equivalent
  below. Readable at 320 px.
- **Notice.** `--status-*-bg` fill, matching icon and words, `--radius-card`.
- **Focus ring.** 3 px `--color-accent`, 2 px offset, on every focusable
  element, never removed.

## 9. Accessibility (REQ-15)

WCAG 2.2 AA. Colour is never the only signal: icon + words. Full keyboard path
with a visible focus ring. Targets 44 px. Works at 320 px. Axe stays at zero
violations on every phase. The planetarium has a keyboard path and a plain list
equivalent; the list is the default on small screens and for screen readers.

## 10. Icons and figures

- Icons: own SVG in `src/icons/`, 24 px grid, 1.75 px stroke, round caps and
  joins, `currentColor` fill rules, coloured by system token (2.3).
  hr_bpm heart with an ECG trace; blood pressure gauge (one icon for the pair);
  temp_core_c thermometer; sleep_h crescent moon with small stars; mood_1_5 face
  on a 1 to 5 scale; glucose_mgdl drop. State icons are a separate set (2.2).
- Instruments: one animated figure per indicator card, driven only by the value
  already shown (heart beats calmly, needle settles, thermometer fills, moon
  rises with hours, face changes, drop fills).
- Body: 2D SVG silhouette lighting the zone of the selected indicator's
  system; the first layer of the 3D body.
- Planetarium: the astronaut at the centre, each indicator a body on its orbit
  with its icon, a ring in the state colour and the state in words. SVG, CSS and
  the Web Animations API only. A real 3D object needs a proposal to Eng 1 with
  size and licence first.

## 11. Do and do not

Do:
- One main thing per screen and one obvious next action.
- State in words and icon first, then the value, then the trend, then sources.
- Cite a token for every colour, size, space and duration.
- Keep the first-load JavaScript under 300 kB raw and 90 kB gzip.

Do not:
- Add a screen, feature, data, health logic or claim. Health wording is not
  ours: never write or change a medical sentence; a possible condition is an
  evidence score, never a percentage, never "you have X".
- Use a logo, flag, patch, mission name, exact NASA colours or any image of
  people under 18. AI-made images or video carry a visible watermark; prefer CSS
  and hand-drawn SVG.
- Add a dependency, a CDN asset or anything that needs the network (REQ-28).
- Put text directly on the stars, or tint a large area with `--color-signal`.
- Use colour as the only signal, or animate layout properties.

## 12. Prompts per screen

Used by the screens subagent; every one starts with "Follow DESIGN.md tokens;
no new behaviour".

- **Intro.** First load only, under 1.2 s, skippable with any key or tap:
  the HeMoSo mark and the real mission day and clock, then the first phase. No
  invented status text.
- **01 Identify.** Eyebrow "01 / IDENTIFY", hero "WHO IS ON DUTY TODAY?" on
  three lines (second line `--color-accent`), one sentence, the crew choice,
  one primary button "Begin the report" with an arrow. Face sign-in stays an
  alternative below.
- **02 Report.** Eyebrow "02 / REPORT", hero over two or three lines, one
  reading at a time: indicator, value with its unit visible, day, time, save.
  Count of readings logged in mono. Back as a text link, one primary
  "See my status".
- **03 Status.** Eyebrow "03 / STATUS", hero, one sentence. First the state of
  every indicator as cards (or the planetarium on wide screens, list by
  default), each with icon, state in words, value, 14-reading trend and one next
  step. History and the table live behind a Disclosure, never open by default.
  One primary "Start a new check".
- **Empty, loading, offline, conflict, needs review.** A Notice with its icon
  and words, one sentence, one action; no blank areas.

## 13. Files each Stage 2 subagent owns

| Topic | Files | Reads |
| --- | --- | --- |
| icons | `src/icons/*` | 2.2, 2.3, 10 |
| instruments | `src/components/instruments/*` | 2.3, 7, 10 |
| body | `src/components/body/*` | 2.3, 10 |
| planetarium | `src/components/planetarium/*` | 2.2, 2.3, 7, 9, 10 |
| motion | `src/motion/*`, the intro | 7 |
| screens | `src/phases/*`, other `src/components/*`, `src/strings.ts` | everything |

Locked files, changed only by the lead: this file, `src/theme/tokens.ts`,
`src/styles.css` (the `:root` blocks), `src/phases.css` (shared rules).

## 14. Known exceptions (QA, Sat 14 Nov)

Accepted deviations, so a later change does not "fix" them by accident:
- Structural sizes (icon boxes, stage and column widths, 54 and 56 px control
  heights) are not tokens. Controls are taller than `--tap-min` on purpose.
- Eyebrow, button and rail labels use wider tracking (0.16em to 0.24em) than
  the `label` step. Colour-mix percentages in overlays are not tokens.
- Large display type and the eyebrow sit on the Starfield; their contrast is
  checked against the plain page colour. Small text sits on a solid surface.
- The heartbeat figure plays three beats and stops; it is not an ambient loop.
- With no attention rule filled in `config/rules`, every state is "no data"
  and the demo shows no state colour; this is a content gap, not a style bug.
- Fonts are fallbacks until the files are approved (section 4.1).
