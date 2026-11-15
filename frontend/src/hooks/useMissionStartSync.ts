import { useEffect } from 'react'
import { setMissionStart, useMissionStart } from '../data/missionStart'
import type { ProfileClient } from '../data/profileClient'

// The mission start of a person with an account is the account's, not this
// device's (REQ-37): every device that signs in counts the same Flight Day.
// Signing in reads the account date, and it wins over the copy on this device.
// An account that holds no date gets the one this device has, which is how a new
// account sends the date chosen while creating it. A server without the route,
// the public demo and the demo astronaut change nothing and show nothing: the
// device copy stays as it was.
export function useMissionStartSync(
  client: ProfileClient,
  personId: string | null,
  kind: 'demo' | 'account' | null,
): void {
  // The device copy, so a date picked here is followed: the effect runs again
  // and the account gets it.
  const deviceDate = useMissionStart(personId)

  useEffect(() => {
    if (personId === null || kind !== 'account' || !client.isConfigured()) return
    void client
      .fetchProfile(personId)
      .then((answer) => {
        // 'missing' is the 404 of a person without an account and of a server
        // that does not have the route: device only, and no sentence about it.
        if (answer.kind !== 'found') return
        const serverDate = answer.profile.missionStart
        if (serverDate !== null) {
          if (serverDate !== deviceDate) setMissionStart(personId, serverDate)
          return
        }
        if (deviceDate !== null) void client.saveMissionStart(personId, deviceDate)
      })
      .catch(() => {
        // A client that throws where the contract says 'retry' is still no
        // answer: the device copy stays.
      })
  }, [client, personId, kind, deviceDate])
}
