import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Render crash caught by ErrorBoundary:', error, info)
  }

  reset() {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="page">
          <div className="card">
            <h1>Something broke 😬</h1>
            <p className="sub">Hit "Try again" to keep going. If it keeps happening, tell your teacher.</p>
            <details className="error-details">
              <summary>Tech details</summary>
              <pre>{String(this.state.error?.message || this.state.error)}</pre>
            </details>
            <div className="row" style={{ marginTop: 16, gap: 10 }}>
              <button className="btn" onClick={() => this.reset()}>Try again</button>
              <button className="btn-secondary btn" onClick={() => { this.reset(); window.location.href = '/' }}>
                Back to start
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
