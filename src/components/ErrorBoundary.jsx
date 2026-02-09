import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error: error.message || 'Something went wrong' };
  }

  componentDidCatch(err, info) {
    console.error('ErrorBoundary caught:', err, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20,
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ color: '#EF5350', fontSize: '0.85rem', textAlign: 'center' }}>
            {this.state.error}
          </div>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '6px 16px', borderRadius: 14, border: '1px solid rgba(79,195,247,0.3)',
              background: 'rgba(79,195,247,0.08)', color: '#4FC3F7',
              fontSize: '0.75rem', cursor: 'pointer',
            }}
          >
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
