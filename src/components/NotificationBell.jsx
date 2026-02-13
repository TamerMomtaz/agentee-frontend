// src/components/NotificationBell.jsx — Phase 3
// Toggle push notifications on/off with visual status indicator.

import { useState, useEffect } from 'react';
import { subscribeToPush, unsubscribeFromPush, isSubscribed } from '../lib/push.js';

export default function NotificationBell() {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    isSubscribed().then((status) => {
      setSubscribed(status);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      if (subscribed) {
        const success = await unsubscribeFromPush();
        // Always reset UI — even if backend cleanup fails,
        // browser subscription is removed
        setSubscribed(!success);
      } else {
        const sub = await subscribeToPush();
        if (sub) {
          setSubscribed(true);
        } else {
          setError('Enable in browser settings');
          // Clear error after 3 seconds
          setTimeout(() => setError(null), 3000);
        }
      }
    } catch (err) {
      setError('Something went wrong');
      setTimeout(() => setError(null), 3000);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const supported = typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window;

  if (!supported) return null;

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      title={subscribed ? 'Notifications ON — click to disable' : 'Enable notifications'}
      style={{
        position: 'relative',
        background: 'none',
        border: 'none',
        cursor: loading ? 'wait' : 'pointer',
        fontSize: '1.1rem',
        padding: '5px 8px',
        borderRadius: 14,
        transition: 'background 0.2s',
        opacity: loading ? 0.5 : 1,
        color: subscribed ? '#66BB6A' : 'rgba(79,195,247,0.4)',
      }}
    >
      {subscribed ? '🔔' : '🔕'}

      {/* Active indicator dot */}
      {subscribed && (
        <span style={{
          position: 'absolute',
          top: 2,
          right: 4,
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: '#66BB6A',
          border: '2px solid #050A18',
        }} />
      )}

      {/* Error tooltip */}
      {error && (
        <span style={{
          position: 'absolute',
          bottom: -24,
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '0.6rem',
          color: '#EF5350',
          whiteSpace: 'nowrap',
          background: 'rgba(0,0,0,0.85)',
          padding: '2px 8px',
          borderRadius: 4,
          fontFamily: "'IBM Plex Mono', monospace",
        }}>
          {error}
        </span>
      )}
    </button>
  );
}
