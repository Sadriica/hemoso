// Ids for new entries. crypto.randomUUID only exists in a secure context, so
// the app opened over plain http on the local network (a phone test, T-50)
// falls back to random bytes, and to the clock plus a counter when the browser
// hides crypto.

let fallbackIdCounter = 0

export function newEntryId(): string {
  const cryptoApi = globalThis.crypto as Crypto | undefined | null
  if (cryptoApi != null && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi != null && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = cryptoApi.getRandomValues(new Uint8Array(16))
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
      '',
    )
  }
  fallbackIdCounter += 1
  return `local-${Date.now()}-${fallbackIdCounter}`
}
