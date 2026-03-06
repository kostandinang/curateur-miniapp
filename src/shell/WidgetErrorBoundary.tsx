import { AlertCircle, RefreshCw } from 'lucide-react'
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  widgetName?: string
}

interface State {
  hasError: boolean
}

class WidgetErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch() {
    // Error captured by getDerivedStateFromError; logging stripped in prod
  }

  handleRetry = () => {
    this.setState({ hasError: false })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: 'var(--c-hint)',
          }}
        >
          <AlertCircle size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
          <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px', color: 'var(--c-text)' }}>
            Something went wrong
          </div>
          <div style={{ fontSize: '13px', marginBottom: '16px' }}>
            {this.props.widgetName ? `${this.props.widgetName} failed to load` : 'Widget failed to load'}
          </div>
          <button
            type="button"
            onClick={this.handleRetry}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderRadius: '10px',
              background: 'var(--c-secondary-bg)',
              color: 'var(--c-text)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

export default WidgetErrorBoundary
