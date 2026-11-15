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
| Outside your usual range | open ring with a dot offset to one side | `--status-attention-text` `#F5C542` / `#6B3A06` | `--status-attention-bg` `#2C2407` / `#FEF3C7` |
| Needs review | triangle with a bar | `--status-review-text` `#FF8A70` / `#9A2A14` | `--status-review-bg` `#33140E` / `#FDE4DE` |
| No data yet | dashed ring | `--status-no-data-text` `#A9B3C1` / `#374151` | `--status-no-data-bg` `#18222F` / `#E5E7EB` |
| Field error and warnings | diamond with a bar | `--status-attention-text` `#F5C542` / `#6B3A06` | `--status-attention-bg` `#2C2407` / `#FEF3C7` |

`--color-signal` is the most urgent level and destructive actions only, and
never fills a large area.

Outside the usual range shares the attention pair with a warning, because both
ask for a look. The open ring and the words keep the two apart, and the diamond
with a bar stays the warning. The blue pair the state had before the visual
review is gone from the palette.

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

### 2.4 Console accents (Sun 15 Nov)

Two accents for decoration only. They draw the scene behind the phases, the
orbit arcs, the scope grid, the channel numbers, the console eyebrows, the
focus glow under a readout and the scan line of a phase change. They never
carry a state (2.2 does), never colour a figure by value, and are never the
only carrier of a meaning. The state, text and surface tokens above are
unchanged.

| Token | Role | Dark | Light |
| --- | --- | --- | --- |
| `--accent-cyan` | Electric cyan: grid, scan line, channel numbers, eyebrows, glow | `#5EE6FF` | `#0E7490` |
| `--accent-violet` | Violet: the far orbit arc and the glow behind the active panel | `#B49CFF` | `#6D28D9` |

Cyan is used for small mono text in two places (the channel number and the
console eyebrow), so those pairs are in the contrast grid and in
`theme.test.ts` at 4.5:1. Violet draws lines and glows only.

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
| Cyan accent | page | 13.38 | 4.85 | 4.5:1 |
| Cyan accent | card | 11.75 | 5.36 | 4.5:1 |
| Cyan accent | raised band | 12.64 | 5.36 | 4.5:1 |
| Violet accent (lines) | page | 8.59 | 6.43 | 3:1 |
Any new pair must be added here and to `theme.test.ts` before it is used.

## 4. Type

### 4.1 Families

| Role | Token | Family | Fallback |
| --- | --- | --- | --- |
| Display (headlines, big numbers' labels) | `--font-display` | Barlow Condensed, SIL OFL | Arial Narrow, Roboto Condensed, system-ui |
| Body | `--font-body` | Inter, SIL OFL | system-ui, Segoe UI, Roboto |
| Mono (telemetry, values, labels) | `--font-mono` | JetBrains Mono, SIL OFL | ui-monospace, Cascadia Mono, Consolas |

Font gate: the files are bundled (Sun 15 Nov, `docs/DECISIONS.md` has the row).
They are self-hosted from `frontend/public/fonts/` with their licence file
(`OFL.txt`): Barlow Condensed 600 and 700, Inter and JetBrains Mono as one
variable file each (400 to 700), Latin subset, woff2. No CDN, ever. The
fallbacks only show while a file loads (`font-display: swap`).

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

## 6. Shape, depth and layers

### 6.1 Shape grammar (round 3)

The screen is a mission scene with a control panel in it, not a form with a
space theme. One shape grammar, five parts:

| Part | Token | Use |
| --- | --- | --- |
| Main panel | `--radius-panel` 24 px, optional cut corner `--cut` 18 px | The one wide surface a phase asks something on; at most one per screen |
| Capsule | `--radius-capsule` | State, telemetry, chips, the segmented control, the rail nodes' labels |
| Card | `--radius-card` 4 px | Inner blocks inside a panel (rows, indicator cards); smaller than the panel, never the dominant shape |
| Arc and line | 1 px `--color-border` or accent at low alpha | Orbits, connection lines and rings replace extra boxes |
| Button | `--radius-small` 2 px or `--radius-capsule` | One primary per screen |

Rules: a cut corner is a decorative clip of the panel and never clips a focus
ring or a field edge (keep controls inside the safe area, outline inside the
offset). Nesting stops at two levels (panel, then card): no card in a card in a
card. Keep `--radius-small` and `--radius-card` for dense data screens (report
rows, tables).

### 6.2 Depth and layers

Depth comes from three layers and a local glow, not from more borders:
`--layer-scene` (the stage: horizon, orbital object, stars in a near, a far and
a dust layer), `--layer-panel` (the main panel, which may overlap the scene by
up to a third of its height) and `--layer-telemetry` (mono telemetry, rail).
`--shadow-float` lifts a floating panel; `--glow-accent` at `--glow-radius`
sits around the protagonist object only, never as a uniform halo. Text always
sits on a solid or near-solid surface (a panel, a capsule, or the plain page
colour with a soft fade), never directly on stars. Under 600 px the scene
shrinks to a band above the panel; it never pushes the primary action below the
first screen.

### 6.3 Stage depth (Sun 15 Nov)

Behind every phase, over the star field and under everything else
(`components/StageDepth.tsx`): a scientific grid in `--accent-cyan` (a fine
line every 24 px, a stronger one every 120 px, fading toward the edges), one
dotted orbit arc in `--accent-violet` with a small body that takes four minutes
a lap, a fainter outer arc, and a soft pool of violet and cyan light where the
active panel sits. All of it is `aria-hidden` and takes no pointer event. The
three layers shift with the scroll by 12 px at most, the nearest one the most.
Under `prefers-reduced-motion`, with the top bar switch, or while the tab is
hidden, nothing moves. CSS gradients and one inline SVG: no image, no library.

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
  block input, last at most 1.2 s, and skip with any key or tap. The intro is
  the one exception: it runs about 5.2 s (`--motion-intro`), and any key or tap
  ends it at once.
- Ambient motion is allowed only in the stage (scene layers drifting, orbits
  turning slowly, the object answering the pointer), never in the panel, and
  stops under reduced motion. It is a few degrees or pixels, never a loop that
  draws the eye away from the one action.
- Everything stops under `prefers-reduced-motion` and with the top bar switch
  (class `app--still`); the app is complete without motion. Animate only
  `transform`, `opacity` and SVG stroke offsets.
- The 30-second demo path never waits on an animation.
- No sound.

### 7.2 Choreography (round 3)

One phase entrance, in order, all skippable by any key or tap and replaced by
the final state under reduced motion (same hierarchy, no motion):

1. Horizon and protagonist object appear (`--motion-horizon`, 700 to 900 ms).
2. Orbits draw with `stroke-dashoffset` (`--motion-draw`).
3. The headline enters line by line, `--motion-stagger` between lines.
4. The panel rises from the object (`--motion-rise`, `--ease-settle`).
5. Picking a crew member closes the ring; the avatar then carries into Report.
6. Hover and press move the element `--move-hover` (2 to 6 px) and
   `--move-press`, with an arrow that answers; transform and opacity only.

The sequence may last up to `--motion-cinematic` plus the intro on first load;
the demo path never waits on it. The pointer response of the object uses a
throttled `pointermove` and one transform; it is off on touch and under reduced
motion.

### 7.3 Channel switch (Sun 15 Nov)

A change of phase reads as a channel switch (`motion/PhaseTransition.tsx`).
One scan line in `--accent-cyan` sweeps the stage and the content of the new
phase settles by 16 px from the side the line came from: top to bottom on a
step forward (identify to report to status), bottom to top on a step back. It
lasts `--motion-slow` (400 ms), uses `transform` and `opacity` only, sits under
the top bar and the rail, and never blocks input. The first load has no
switch. With motion off nothing of it is rendered: the new phase is simply
there. In both cases the focus lands on the heading of the new phase, and the
phase inside is never remounted by the switch.

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
- **Phase rail.** Fixed at the bottom on `--color-bg-raised`, `--rail-height`
  tall: three numbered nodes on one track, the labels under them, the current
  step in `--color-accent` and a step larger, the steps already walked with a
  check, and the track filled up to the current node. `aria-current="step"`.
  It says where the astronaut is; the next step is its own node, so no extra
  line repeats it.
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

- **Intro.** First load only, about 5.2 s, skippable with any key or tap: the
  sky drifts, the mark draws itself, the name types in, then the first phase:
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
- Fonts are self-hosted in `public/fonts/` (section 4.1); the fallbacks show only while a file loads.

## 15. Mission scene (round 3, Sat 14 Nov 23:50)

Decision (Wambi): the interface works and is clear, but it reads as an
administrative form with a space theme. The next round changes the visual
structure, not the technical base (React, the existing Three.js body stay; no
new dependency, no imported background, icon or image, no generated image; the
scene is our own CSS, Canvas and SVG).

Keep: the headline hierarchy, the palette and contrast, the path identify ->
report -> status, accessibility with colour never alone, the technical look.

Identify composition (two zones): telemetry and headline on the left; a
protagonist object (orbital scanner or body silhouette with orbits, slow depth,
pointer response) on the right; the main panel carries one primary action,
"Open the demo", visible at once; username and PIN sit in a secondary panel
behind a disclosure; the face option stays first among sign-in methods.

Ownership of files by slice (nobody edits another slice's files; tokens and
class names from this file and `styles.css` are the interface):

| Slice | Files |
| --- | --- |
| W1 composition | `phases/identify.css`, `phases/IdentifyPhase.tsx` (structure), `phases.css` panel and capsule rules |
| W2 scene | `components/orbital/*` (new), `components/Starfield.tsx` |
| W3 choreography | `motion/*`, the phase entrance |
| W4 Identify to Report transition | the phase switch only, after W2 and W3 |
| W5 report and status grammar | `screens/entry.css`, `screens/Entry.tsx` presentation, status card CSS, instruments; after W1 to W3 |

Not ours: `reaction/**` and `screens/entryDraft.ts` (the reaction check).

## 16. Console grammar (Sun 15 Nov)

The Report reads as a telemetry console: the astronaut operates a physiological
monitoring system, not a form. Nothing here adds a value to the palette; it
arranges the tokens of sections 2 to 7.

- **Panel.** One per indicator, on `--color-bg-raised` with a hairline frame, a
  2 px top edge in the system colour (2.3) and two corner marks at the bottom.
  Reading order inside: channel number (`01`, mono `label`) over the system
  icon; the name in display uppercase (`h2`); the last reading in mono; the
  context tag only when it differs from the header; the state of the last
  reading as the state badge (2.2); the scope; the readout; the small history.
  A filled or saved panel has a 4 px top edge and a check on its icon.
- **Scope.** A window with the page grid behind it and one live figure in the
  system colour, drawn only from the value in the readout, or from the last
  reading while the readout is empty. Heart rate: a pulse trace that moves at
  the pace of the value. Blood pressure: two bars on one scale, systolic over
  diastolic. Core temperature: a ring. Blood glucose and any other measured
  value: a level scale with one marker. Sleep: twelve hour cells. Mood: five
  rising steps. The scales are drawing bounds (`instruments/scales.ts`), never
  clinical ranges, and a figure never changes colour by value. Every figure is
  `aria-hidden`: the value, the unit and the state are words beside it.
- **Readout.** The typed value in mono at the `value` step on a single 2 px
  rule, the unit in mono beside it. It is still one labelled text field; the
  rule turns `--color-accent` on focus and attention on an error. No box.
- **History.** A small line of the person's own earlier readings in the panel's
  context (at most 14, the baseline window), the newest as a dot and a typed
  value as an open dot joined by a dashed line. Under it, in mono `label`, the
  count and the lowest and highest in words. It updates when a reading is saved.
- **Real data only.** Every number and every mark comes from the person's
  entries or from `config/`. No decorative readout, no invented sensor, no
  status text that is not computed.
- **Motion.** The pulse trace is the one loop, at most 220 beats a minute on
  screen; everything else is a 250 ms settle on `transform`, `opacity` or a
  stroke offset. All of it stops under `prefers-reduced-motion`, with the top
  bar switch, and while the tab is hidden.
- **Phone.** At 390 px the console is one column of panels, each in the same
  reading order; nothing sits side by side inside a panel.
- **Status.** The same grammar. A system strip over the overview counts the
  channels and how many are in each state (icon and words, from the statuses
  on screen). From 900 px the 3D body stands in the centre of the orbits,
  where the astronaut mark was: only the figure, no tile and no frame, sized
  as a share of the stage (10 % wide, 50 % tall) so the nearest indicators
  stay clear of it, lighting the zone of the selected indicator. It is
  decoration there: hidden from assistive technology, taking no pointer
  event, with the centre named in words for a screen reader. While the 3D
  chunk loads, and whenever it cannot be loaded or drawn, the flat body
  outline takes the same place, so the centre is never empty. The indicator
  card is one framed panel under the orbits, its state on the top edge. The
  possible conditions are an evidence board: one framed tile per condition,
  its step on the top edge.

### 16.1 History trend (Sun 15 Nov)

The History screen opens with one framed trend panel per indicator, in the same
grammar as the report panels: hairline frame, 2 px accent top edge, corner
marks, mono labels.

- **Series.** The person's readings over Flight Days (x) and value (y), one mark
  per reading, joined by a line. Two segmented controls sit above it: the
  context (the NASA labels of `strings.entry.contextLabels`, opening on the
  context with most readings) and "Last 14" or "All".
- **Band.** The person's usual band, a soft strip: the median of the last 14
  readings in the selected context and 3 spreads each side (`domain/trend.ts`,
  the same rule as the state). No band under 3 readings, and it says so.
- **Thresholds.** Thin dotted lines with the level name, only for attention rows
  whose source is a link.
- **Marks.** A shape per state, never colour alone: circle in range, diamond
  outside, triangle needs review, open circle no data. A second series (blood
  pressure) uses the square family (square, plus, inverted triangle, open
  square) and a dashed line.
- **Readout.** One line above the plot, never over it: value with unit, Flight
  Day, GMT time, context and the state in words. Hover, tap or the arrow keys
  (Left, Right, Home, End; Up and Down between two series; Escape clears)
  fill it. The table below stays the text equivalent.
- **Motion.** The series rises (opacity, transform) and the first line draws
  (stroke offset) when the chart mounts or a filter changes. Off under
  `prefers-reduced-motion`, with the top bar switch and paused while the tab is
  hidden.
- **Phone.** At 390 px the chart fills the width, the context segments sit two
  by two, the readout keeps its own block and the tables scroll in their box.
