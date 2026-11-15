import { useEffect, useState } from 'react'

// True under 600 px, the phone breakpoint of the stylesheets. Followed on
// resize; false where matchMedia does not exist.
const QUERY = '(max-width: 599px)'

export function usePhone(): boolean {
  const [phone, setPhone] = useState(
    () => window.matchMedia?.(QUERY).matches ?? false,
  )
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia(QUERY)
    const update = (): void => setPhone(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])
  return phone
}
