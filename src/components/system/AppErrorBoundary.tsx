import { AlertCircle } from 'lucide-react'
import { Component, type PropsWithChildren } from 'react'

export class AppErrorBoundary extends Component<PropsWithChildren, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override render() {
    if (this.state.hasError) {
      return (
        <main className="app-shell">
          <section className="empty-state">
            <AlertCircle size={32} />
            <h2>Something went wrong</h2>
            <p>The WorkTrack shell hit an unexpected rendering error.</p>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}
