import { strings } from '../strings'

// The synthetic data sentence of REQ-14, in the top bar of every phase.
export default function SyntheticNotice() {
  return <p className="synthetic-notice">{strings.syntheticNotice}</p>
}
