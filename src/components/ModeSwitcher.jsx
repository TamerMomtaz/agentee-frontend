// src/components/ModeSwitcher.jsx — Phase 3
// 5-mode pill selector with dropdown, syncs with backend.

import { useState, useEffect } from 'react';

const BASE = import.meta.env.VITE_API_URL || 'https://agentee.up.railway.app/api/v1';

const MODES = [
  { id: 'default', label: 'Default',  labelAr: 'عادي',   desc: 'Balanced — router decides', color: '#4FC3F7', icon: '⚡' },
  { id: 'deep',    label: 'Deep',     labelAr: 'عميق',   desc: 'Claude, 4096 tokens',       color: '#CE93D8', icon: '🔬' },
  { id: 'crema',   label: 'Crema',    labelAr: 'كريمة',  desc: 'Quick wins, 1024 tokens',    color: '#FFD54F', icon: '☕' },
  { id: 'creative',label: 'Creative', labelAr: 'إبداعي', desc: 'Kahotia mode — Arabic',      color: '#F48FB1', icon: '🎨' },
  { id: 'factory', label: 'Factory',  labelAr: 'مصنع',   desc: 'Al-Manar — ISO, HSE, OEE',   color: '#66BB6A', icon: '🏭' },
];

export default function ModeSwitcher() {
  const [currentMode, setCurrentMode] = useState(() => {
    try { return localStorage.getItem('agentee_mode') || 'default'; } catch { return 'default'; }
  });
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const active = MODES.find((m) => m.id === currentMode) || MODES[0];

  const switchMode = async (modeId) => {
    if (modeId === currentMode || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/mode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: modeId }),
      });
      if (res.ok) {
        setCurrentMode(modeId);
        try { localStorage.setItem('agentee_mode', modeId); } catch {}
      }
    } catch (err) {
      console.error('[Mode] Switch failed:', err);
    } finally {
      setLoading(false);
      setExpanded(false);
    }
  };

  // Sync mode on mount
  useEffect(() => {
    fetch(`${BASE}/modes`)
      .then((r) => r.json())
      .then((data) => {
        if (data.current_mode) {
          setCurrentMode(data.current_mode);
          try { localStorage.setItem('agentee_mode', data.current_mode); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Current mode pill */}
      <button
        onClick={() => setExpanded(!expanded)}
        disabled={loading}
        className="opus-toggle"
        style={{
          borderColor: active.color + '60',
          background: active.color + '15',
          color: active.color,
          opacity: loading ? 0.6 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        <span>{active.icon}</span>
        <span>{active.label.toUpperCase()}</span>
        <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>{expanded ? '▲' : '▼'}</span>
      </button>

      {/* Dropdown */}
      {expanded && (
        <>
          {/* Click-outside overlay */}
          <div
            onClick={() => setExpanded(false)}
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          />
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            zIndex: 100,
            minWidth: 230,
            background: 'rgba(5,10,24,0.95)',
            border: '1px solid rgba(79,195,247,0.12)',
            borderRadius: 12,
            padding: 6,
            backdropFilter: 'blur(14px)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {MODES.map((mode) => {
              const isActive = mode.id === currentMode;
              return (
                <button
                  key={mode.id}
                  onClick={() => switchMode(mode.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    width: '100%',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: 8,
                    background: isActive ? mode.color + '18' : 'transparent',
                    cursor: isActive ? 'default' : 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                    color: '#E0E8F0',
                  }}
                >
                  <span style={{ fontSize: '1rem' }}>{mode.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      fontSize: '0.78rem',
                      color: isActive ? mode.color : '#E0E8F0',
                      fontFamily: "'IBM Plex Sans', sans-serif",
                    }}>
                      {mode.label}
                      <span style={{ opacity: 0.4, marginLeft: 6, fontSize: '0.65rem', fontFamily: 'serif' }}>
                        {mode.labelAr}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.62rem', opacity: 0.4, marginTop: 1, fontFamily: "'IBM Plex Mono', monospace" }}>
                      {mode.desc}
                    </div>
                  </div>
                  {isActive && <span style={{ color: mode.color, fontSize: '0.7rem' }}>●</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
