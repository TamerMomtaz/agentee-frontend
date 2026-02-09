import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 24, textAlign: 'center', color: '#EF5350',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flex: 1, gap: 12
        }}>
          <div style={{ fontSize: '2rem' }}>⚠️</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Something crashed</div>
          <div style={{ fontSize: '0.75rem', color: 'rgba(239,83,80,0.6)', maxWidth: 300 }}>
            {this.state.error?.message || 'Unknown error'}
          </div>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              marginTop: 8, padding: '10px 24px', borderRadius: 16,
              border: '1px solid #EF5350', background: 'rgba(239,83,80,0.1)',
              color: '#EF5350', cursor: 'pointer', fontSize: '0.85rem'
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
