import { Button } from '@mui/material'
import { strings } from '../strings'

// Out of the way until it has focus, then a primary button that jumps to the
// main content (7.5). It stays the first thing Tab reaches, so a keyboard user
// can pass the header in one step (REQ-15).
export default function SkipLink() {
  return (
    <Button
      component="a"
      href="#main-content"
      variant="contained"
      sx={{
        position: 'absolute',
        top: 8,
        left: 8,
        zIndex: 10,
        transform: 'translateY(-200%)',
        '&:focus-visible': { transform: 'none' },
      }}
    >
      {strings.skipToMain}
    </Button>
  )
}
