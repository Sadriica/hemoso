import { Typography } from '@mui/material'
import { strings } from '../strings'

// The synthetic data note of REQ-14, on every tab. A sentence in body type: the
// metadata line above it already carries the short label.
export default function SyntheticNotice() {
  return (
    <Typography component="p" variant="body2" sx={{ color: 'text.secondary' }}>
      {strings.syntheticNotice}
    </Typography>
  )
}
