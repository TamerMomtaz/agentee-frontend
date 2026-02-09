import { useState, useCallback } from 'react';
import Wave from './Wave.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';

const MODES = [
  { key: 'dialogue', label: '💬 Dialogue', color: '#4FC3F7' },
  { key: 'narration', label: '📖 Narration', color: '#CE93D8' },
  { key: 'direction', label: '🎬 Direction', color: '#FFD54F' },
  { key: 'idea', label: '💡 Idea', color: '#66BB6A' },
];

export default function WritingSession({ onEnd, onChunk }) {
  const [chunks, setChunks] = useState([]);
  const [mode, setMode] = useState('dialogue');
  const [lang, setLang] = useState('ar-EG'); // ★ Default to Arabic since that's Tee's primary book language

  // ★ FIX: This callback updates every time `mode` changes.
  // The fixed useSpeechRecognition hook uses a ref internally,
  // so the running recognition always calls the LATEST version of this callback.
  const onResult = useCallback((text) => {
    const chunk = { type: mode, text, lang, ts: Date.now() };
    setChunks(p => [...p, chunk]);
    if (onChunk) onChunk(chunk);
  }, [mode, lang, onChunk]);

  const speech = useSpeechRecognition({ lang, continuous: true, onResult });

  const toggleLang = () => {
    // ★ FIX: Only toggle between en-US and ar-EG
    // 'arz' is not a valid Web Speech API language code and caused silent failures
    const newLang = lang === 'en-US' ? 'ar-EG' : 'en-US';
    if (speech.listening) {
      speech.stop();
      setLang(newLang);
      // ★ FIX: Increased delay from 300ms to 500ms for more reliable restart
      setTimeout(() => speech.start(newLang), 500);
    } else {
      setLang(newLang);
    }
  };

  const langLabel = lang === 'en-US' ? '🇬🇧 EN' : '🇪🇬 عامية';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Session header */}
      <div style={{
        padding: '10px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap',
        borderBottom: '1px solid rgba(255,213,79,0.1)',
      }}>
        <span style={{ fontSize: '0.75rem', color: '#FFD54F', fontFamily: 'monospace' }}>
          ✍️ BOOK MODE
        </span>
        <span style={{ flex: 1 }} />
        <button onClick={toggleLang} style={{
          padding: '4px 10px', borderRadius: 12, border: '1px solid rgba(79,195,247,0.2)',
          background: 'rgba(79,195,247,0.06)', color: '#4FC3F7',
          fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace',
        }}>{langLabel}</button>
        <button onClick={() => onEnd(chunks)} style={{
          padding: '4px 12px', borderRadius: 12, border: '1px solid rgba(239,83,80,0.3)',
          background: 'rgba(239,83,80,0.08)', color: '#EF5350',
          fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace',
        }}>⏹ End Session</button>
      </div>

      {/* Mode selector — ★ now shows active mode clearly */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setMode(m.key)}
            style={{
              padding: '4px 12px', borderRadius: 14, fontSize: '0.68rem',
              border: `1px solid ${mode === m.key ? m.color + '80' : 'rgba(255,255,255,0.08)'}`,
              background: mode === m.key ? m.color + '15' : 'transparent',
              color: mode === m.key ? m.color : 'rgba(224,232,240,0.4)',
              cursor: 'pointer', transition: 'all 0.2s',
              // ★ Added: stronger visual indicator for active mode
              fontWeight: mode === m.key ? '600' : '400',
              boxShadow: mode === m.key ? `0 0 8px ${m.color}30` : 'none',
            }}
          >{m.label}</button>
        ))}
      </div>

      {/* ★ Active mode indicator — shows what type will be recorded next */}
      <div style={{
        padding: '2px 16px 6px', fontSize: '0.6rem', fontFamily: 'monospace',
        color: MODES.find(m => m.key === mode)?.color || '#4FC3F7',
        opacity: 0.7,
      }}>
        Recording as: {MODES.find(m => m.key === mode)?.label} • {langLabel}
      </div>

      {/* Chunks display */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
        {chunks.map((c, i) => {
          const m = MODES.find(x => x.key === c.type) || MODES[0];
          return (
            <div key={i} style={{
              padding: '8px 12px', marginBottom: 6, borderRadius: 10,
              background: 'rgba(255,255,255,0.03)', border: `1px solid ${m.color}20`,
              fontSize: '0.82rem', lineHeight: 1.6,
              direction: c.lang?.startsWith('ar') ? 'rtl' : 'ltr',
            }}>
              <span style={{ fontSize: '0.6rem', color: m.color, fontFamily: 'monospace' }}>
                {m.label}
              </span>
              <div style={{ marginTop: 4, color: '#E0E8F0' }}>{c.text}</div>
            </div>
          );
        })}

        {/* Live interim while recording */}
        {speech.listening && speech.interim && (
          <div style={{
            padding: '8px 12px', borderRadius: 10, marginBottom: 6,
            background: 'rgba(239,83,80,0.05)', border: '1px dashed rgba(239,83,80,0.2)',
            fontSize: '0.82rem', color: 'rgba(224,232,240,0.5)', fontStyle: 'italic',
            direction: lang.startsWith('ar') ? 'rtl' : 'ltr',
          }}>
            {speech.interim}
          </div>
        )}

        {/* Empty state */}
        {chunks.length === 0 && !speech.listening && (
          <div style={{
            textAlign: 'center', padding: '40px 20px',
            color: 'rgba(224,232,240,0.2)', fontSize: '0.8rem',
          }}>
            Select a mode above, then tap 🎙 to start capturing.<br />
            Switch modes while recording — each segment gets tagged.
          </div>
        )}
      </div>

      {/* Record button */}
      <div style={{
        padding: '14px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12,
        borderTop: '1px solid rgba(255,213,79,0.08)',
      }}>
        <Wave active={speech.listening} />
        <button
          onClick={() => { if (speech.listening) speech.stop(); else speech.start(lang); }}
          style={{
            width: 64, height: 64, borderRadius: '50%',
            border: speech.listening ? '3px solid #EF5350' : `3px solid ${MODES.find(m => m.key === mode)?.color || '#FFD54F'}40`,
            background: speech.listening ? 'rgba(239,83,80,0.15)' : 'rgba(255,213,79,0.06)',
            color: speech.listening ? '#EF5350' : MODES.find(m => m.key === mode)?.color || '#FFD54F',
            cursor: 'pointer', fontSize: '1.4rem',
            animation: speech.listening ? 'mic-pulse 1.2s ease-in-out infinite' : 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {speech.listening ? '⏹' : '🎙'}
        </button>
        <span style={{
          fontSize: '0.68rem', color: 'rgba(224,232,240,0.35)', fontFamily: 'monospace',
        }}>
          {speech.listening ? '● Recording...' : `${chunks.length} segments`}
        </span>
      </div>
    </div>
  );
}
