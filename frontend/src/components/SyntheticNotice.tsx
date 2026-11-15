import { strings } from '../strings'

// The synthetic data sentence of REQ-14: a 28 px strip under the top bar, so it
// is on screen on every phase without a line inside the bar itself.
export default function SyntheticNotice() {
  return <p className="synthetic-notice">{strings.syntheticNotice}</p>
}
