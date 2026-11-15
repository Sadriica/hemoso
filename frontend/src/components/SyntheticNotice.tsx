import { strings } from '../strings'

// The synthetic data sentence of REQ-14: quiet text inside the top bar, so it
// is on screen on every phase. The bar places it: beside the mission line on a
// wide screen, on a row of its own under it on a narrow one.
export default function SyntheticNotice() {
  return <p className="synthetic-notice">{strings.syntheticNotice}</p>
}
