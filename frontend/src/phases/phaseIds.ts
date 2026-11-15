// The three phases of the guided check, in their only order.
export type PhaseId = 'identify' | 'report' | 'status'

export const PHASES: readonly PhaseId[] = ['identify', 'report', 'status']
