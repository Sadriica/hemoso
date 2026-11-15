import { lazy, Suspense, useRef, useState } from 'react'
import {
  canUseCamera,
  dismissFaceOffer,
  faceOfferDismissed,
  hasFace,
} from '../data/faceOffer'
import { strings } from '../strings'

// The camera panel brings the face engine, so it loads only when asked for.
const FaceSignIn = lazy(() => import('../screens/FaceSignIn'))

// The offer to add face sign-in on this device (REQ-36), as one quiet line at
// the top of the report. It comes after a PIN sign-in, never in its way: the
// person is already in the check. It shows only when the device has a camera
// and no face of that person, and once "Not now" is pressed it is not shown
// again for that person on this device.

export default function FaceOffer({ personId }: { personId: string }) {
  const copy = strings.signIn
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(
    () => !canUseCamera() || hasFace(personId) || faceOfferDismissed(personId),
  )
  const addRef = useRef<HTMLButtonElement>(null)

  if (hidden) return null

  if (open) {
    return (
      <div className="face-offer face-offer--open">
        <Suspense fallback={<p role="status">{strings.face.opening}</p>}>
          <FaceSignIn
            personId={personId}
            // Signed in already: a match changes nothing here.
            onPersonSelected={() => {}}
            onFocusPicker={() => addRef.current?.focus()}
            fallback="register"
            onClose={() => {
              setOpen(false)
              if (hasFace(personId)) setHidden(true)
            }}
          />
        </Suspense>
      </div>
    )
  }

  return (
    <p className="face-offer">
      <span className="face-offer__words">{copy.faceOfferLine}</span>
      <button
        ref={addRef}
        type="button"
        className="face-offer__action"
        onClick={() => setOpen(true)}
      >
        {copy.faceOfferAction}
      </button>
      <button
        type="button"
        className="face-offer__action face-offer__action--quiet"
        onClick={() => {
          dismissFaceOffer(personId)
          setHidden(true)
        }}
      >
        {copy.faceOfferSkip}
      </button>
    </p>
  )
}
