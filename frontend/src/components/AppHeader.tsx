import type { RefObject } from 'react'
import {
  AppBar,
  Box,
  Button,
  Stack,
  TextField,
  Toolbar,
  Typography,
} from '@mui/material'
import type { EntryStore, Outbox } from '../data/entryStore'
import type { SyncClient } from '../data/sync'
import type { MissionClock } from '../domain/clock'
import { LAYOUT, TYPE_SCALE, TYPE_SCALE_SMALL } from '../theme/tokens'
import { strings } from '../strings'
import SyncStatus from './SyncStatus'
import SyntheticNotice from './SyntheticNotice'

/**
 * The id of the person picker. The label points at it, and the face panel puts
 * the focus back on it when the camera is blocked, so it is a contract.
 */
export const PERSON_PICKER_ID = 'person-picker'

interface AppHeaderProps {
  personIds: string[]
  personId: string
  onPersonChange: (personId: string) => void
  /** Day and clock time of the mission metadata line (style guide 5). */
  clock: MissionClock
  store: EntryStore & Outbox
  client: SyncClient
  /** The face control exists only on a page opened with ?face=1 (REQ-14). */
  faceEnabled: boolean
  faceOpen: boolean
  onToggleFace: () => void
  faceButtonRef: RefObject<HTMLButtonElement | null>
}

// The header band (7.1): app name, the mission metadata line, the synthetic
// data note, the person picker and the face control, then the sync row. One
// title, so the app name stays the only level 1 heading.
export default function AppHeader({
  personIds,
  personId,
  onPersonChange,
  clock,
  store,
  client,
  faceEnabled,
  faceOpen,
  onToggleFace,
  faceButtonRef,
}: AppHeaderProps) {
  return (
    <AppBar
      color="default"
      elevation={0}
      // Relative, not static: the band is the box the toolbar and its
      // decoration are positioned in, and `overflow: hidden` keeps the line
      // inside it.
      position="relative"
      sx={{
        borderBottom: '1px solid',
        borderColor: 'divider',
        backgroundImage: 'none',
        overflow: 'hidden',
      }}
    >
      <Toolbar
        disableGutters
        sx={{
          position: 'relative',
          // The orbital line is a child with a negative z-index: this stacking
          // context keeps it above the band and below every word.
          isolation: 'isolate',
          flexDirection: 'column',
          alignItems: 'stretch',
          gap: 1,
          width: '100%',
          maxWidth: LAYOUT.containerWidth,
          mx: 'auto',
          px: { xs: `${LAYOUT.gutter.phone}px`, sm: 4, md: `${LAYOUT.gutter.desktop}px` },
          py: { xs: 1, md: 1.5 },
          minHeight: { xs: 'auto', md: 72 },
        }}
      >
        {/* With the face control the account row is wider and reaches into the
            only empty space of the band, so the decoration steps aside. */}
        {!faceEnabled && <OrbitalLine />}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2.5, md: 3 }}
          useFlexGap
          sx={{
            justifyContent: 'space-between',
            alignItems: { xs: 'stretch', md: 'center' },
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              component="h1"
              variant="display"
              sx={{
                fontSize: {
                  xs: `${TYPE_SCALE_SMALL.display.size}px`,
                  md: `${TYPE_SCALE.display.size}px`,
                },
                lineHeight: {
                  xs: `${TYPE_SCALE_SMALL.display.lineHeight}px`,
                  md: `${TYPE_SCALE.display.lineHeight}px`,
                },
              }}
            >
              {strings.appName}
            </Typography>
            <Typography component="p" variant="label" sx={{ mt: 0.5 }}>
              {strings.header.metadata(clock.missionDay, clock.time)}
            </Typography>
            <SyntheticNotice />
          </Box>
          <Stack
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ flexWrap: 'wrap', alignItems: 'center' }}
          >
            <PersonPicker
              personIds={personIds}
              personId={personId}
              onPersonChange={onPersonChange}
            />
            {faceEnabled && (
              <Button
                ref={faceButtonRef}
                variant="outlined"
                aria-expanded={faceOpen}
                aria-controls={faceOpen ? 'face-panel' : undefined}
                onClick={onToggleFace}
              >
                {strings.face.buttonLabel}
              </Button>
            )}
          </Stack>
        </Stack>
        <SyncStatus store={store} client={client} />
      </Toolbar>
    </AppBar>
  )
}

// The person picker (7.1). A native select inside the MUI field: the browser
// keeps its own list, its keyboard and its options for assistive technology,
// and the label stays the one word a person hears.
function PersonPicker({
  personIds,
  personId,
  onPersonChange,
}: {
  personIds: string[]
  personId: string
  onPersonChange: (personId: string) => void
}) {
  return (
    <TextField
      select
      slotProps={{ select: { native: true } }}
      id={PERSON_PICKER_ID}
      label={strings.personPickerLabel}
      value={personId}
      onChange={(event) => onPersonChange(event.target.value)}
      sx={{ minWidth: 0, width: { xs: '100%', sm: 200 } }}
    >
      {personIds.map((id) => (
        <option key={id} value={id}>
          {id}
        </option>
      ))}
    </TextField>
  )
}

// One thin curved line in the header band (5). Decoration only: it carries no
// data, it is hidden from assistive technology, and it never moves, so there is
// nothing to switch off when the person asks for reduced motion.
//
// It sits in the empty part of the band, between the app name block and the
// person picker, and it is painted behind every word. Below 900 px the app
// name, the metadata line and the picker take the full width of the band, so
// the line cannot be kept away from the text and is not shown at all there.
function OrbitalLine() {
  return (
    <Box
      aria-hidden="true"
      sx={{
        display: { xs: 'none', md: 'block' },
        position: 'absolute',
        // Under the words of the band, through this stacking context.
        zIndex: -1,
        top: 0,
        // The band ends above the sync status row: the line never goes behind
        // those words either.
        bottom: 30,
        left: '56%',
        // The person picker is a 200 px field at the right end of the same row,
        // so the line stops before it.
        right: 300,
        overflow: 'hidden',
        pointerEvents: 'none',
        color: 'secondary.main',
        opacity: 0.16,
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 600 120"
        preserveAspectRatio="none"
        focusable="false"
        sx={{ width: '100%', height: '100%', display: 'block' }}
      >
        <path
          d="M-20 104C120 34 260 112 390 62S550 20 620 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
        />
      </Box>
    </Box>
  )
}
