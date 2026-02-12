// src/components/GuardTeeWidget.jsx — Phase 3
// Visual health status dashboard for all monitored services.

import { useState, useEffect, useCallback } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://agentee.up.railway.app/api/v1';

const STATUS_CONFIG = {
  healthy:  { color: '#66BB6A', bg: '#66BB6A12', icon: '✅', label: 'Healthy' },
  degraded: { color: '#FFD54F', bg: '#FFD54F12', icon: '⚠️', label: 'Slow'    },
  down:     { color: '#EF5350', bg: '#EF535012', icon: '🔴', label: 'Down'    },
  unknown:  { color: '#9E9E9E', bg: '#9E9E9E12', icon: '❓', label: 'Unknown' },
};

const FRIENDLY_NAMES = {
  'A-GENTEE Backend':     'Backend API',
  'A-GENTEE Frontend':    'Frontend PWA',
  'Book of Tee Frontend': 'Book of Tee',
  'Book of Tee Backend':  'BoT API',
  'Supabase':             'Supabase',
};

export default function GuardTeeWidget() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/guard/status`);
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[GuardTee] Status fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const runCheck = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${BASE}/guard/check`);
      const data = await res.json();
      if (data.services) {
        setServices(data.services);
        setLastUpdated(new Date().toLocaleTimeString());
      }
    } catch (err) {
      console.error('[GuardTee] Check failed:', err);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const totalCount = services.length;
  const allHealthy = healthyCount === totalCount && totalCount > 0;

  return (
    <div style={{
      background: 'rgba(10,22,40,0.6)',
      borderRadius: 16,
      padding: 16,
      border: '1px solid rgba(79,195,247,0.08)',
      margin: '12px 16px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: "'Playfair Display', serif" }}>
            🛡️ GuardTee
          </div>
          <div style={{ fontSize: '0.62rem', opacity: 0.4, fontFamily: "'IBM Plex Mono', monospace", marginTop: 2 }}>
            {loading ? 'Loading...' : allHealthy ? `All ${totalCount} healthy` : `${healthyCount}/${totalCount} healthy`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {lastUpdated && (
            <span style={{ fontSize: '0.58rem', opacity: 0.3, fontFamily: "'IBM Plex Mono', monospace" }}>
              {lastUpdated}
            </span>
          )}
          <button
            onClick={runCheck}
            disabled={checking}
            className="ws-btn-sm"
            style={{ opacity: checking ? 0.5 : 1, cursor: checking ? 'wait' : 'pointer' }}
          >
            {checking ? '⏳' : '🔄'} Check
          </button>
        </div>
      </div>

      {/* Status bar */}
      {totalCount > 0 && (
        <div style={{ display: 'flex', gap: 2, marginBottom: 10, borderRadius: 3, overflow: 'hidden', height: 4 }}>
          {services.map((s, i) => {
            const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.unknown;
            return <div key={i} style={{ flex: 1, background: cfg.color, opacity: 0.7 }} />;
          })}
        </div>
      )}

      {/* Service cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 16, opacity: 0.3, fontSize: '0.78rem' }}>Loading...</div>
        ) : services.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 16, opacity: 0.3, fontSize: '0.78rem' }}>
            No data yet — hit Check
          </div>
        ) : (
          services.map((service, i) => {
            const cfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.unknown;
            const name = FRIENDLY_NAMES[service.service_name] || service.service_name;
            return (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 10,
                background: cfg.bg,
                border: `1px solid ${cfg.color}20`,
              }}>
                <span style={{ fontSize: '0.85rem' }}>{cfg.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.75rem', fontFamily: "'IBM Plex Sans', sans-serif" }}>
                    {name}
                  </div>
                  {service.error && (
                    <div style={{ fontSize: '0.6rem', color: '#EF5350', marginTop: 1, opacity: 0.8 }}>
                      {service.error}
                    </div>
                  )}
                </div>
                {service.response_ms != null && (
                  <span style={{
                    fontSize: '0.62rem',
                    fontWeight: 600,
                    padding: '1px 7px',
                    borderRadius: 6,
                    background: 'rgba(255,255,255,0.05)',
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontVariantNumeric: 'tabular-nums',
                    color: service.response_ms < 300 ? '#66BB6A' : service.response_ms < 1000 ? '#FFD54F' : '#EF5350',
                  }}>
                    {service.response_ms}ms
                  </span>
                )}
                <span style={{
                  fontSize: '0.58rem',
                  fontWeight: 700,
                  color: cfg.color,
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                  fontFamily: "'IBM Plex Mono', monospace",
                }}>
                  {cfg.label}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
