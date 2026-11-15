import { Component, type ErrorInfo, type ReactNode } from 'react'

// A figure that fails to draw must never take the screen with it. React
// unmounts the whole tree when a render or an effect throws and nothing
// catches it, so every visual piece (the body, the planetarium, an instrument)
// sits inside one of these, and the app has one around each phase as the last
// line. What it shows instead is the caller's choice: nothing, or a sentence.
interface ErrorBoundaryProps {
  /** What to show in place of the part that failed. */
  fallback: ReactNode
  children: ReactNode
}

interface ErrorBoundaryState {
  failed: boolean
}

export default class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { failed: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Kept in the console for the team; the astronaut reads the fallback.
    console.warn('A part of the screen could not be drawn.', error, info)
  }

  render(): ReactNode {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
