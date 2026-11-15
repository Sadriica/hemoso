import { strings } from '../strings'

// Out of the way until it has focus, then a primary button that jumps to the
// current phase. It stays the first thing Tab reaches, so a keyboard user can
// pass the top bar in one step (REQ-15).
export default function SkipLink() {
  return (
    <a className="skip-link" href="#main-content">
      {strings.skipToMain}
    </a>
  )
}
