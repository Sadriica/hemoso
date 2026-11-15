import { useId, useState, type ReactNode } from 'react'
import { UtilityIcon } from '../icons'

// A disclosure: a button toggling a panel, with aria-expanded and
// aria-controls. The panel is rendered only when open. The chevron is
// decorative (aria-hidden); aria-expanded is the real state.
export default function Disclosure({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const panelId = useId()

  return (
    <div className="disclosure">
      <button
        type="button"
        className="disclosure__toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="disclosure__chevron" aria-hidden="true">
          <UtilityIcon kind="chevron" size={16} />
        </span>
        {label}
      </button>
      {open && (
        <div id={panelId} className="disclosure__panel">
          {children}
        </div>
      )}
    </div>
  )
}
