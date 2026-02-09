import { useState, useRef, useCallback } from 'react';

export default function Mic({ onAudio, disabled }) {
  const [rec, setRec] = useState(false);
  const [dur, setDur] = useState(0);
  const mr = useRef(null);
  const chunks = useRef([]);
  const tmr = useRef(null);
  const st = useRef(0);

  const stop = useCallback(() => {
    if (mr.current && mr.current.state === 'recording') mr.current.stop();
    if (tmr.current) { clearInterval(tmr.current); tmr.current = null; }
    setRec(false);
    setDur(0);
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      chunks.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: 'audio/webm' });
        stream.getTracks().forEach((t) => t.stop());
        if (Date.now() - st.current > 800 && blob.size > 1000) onAudio(blob);
      };
      mr.current = recorder;
      st.current = Date.now();
      recorder.start(250);
      setRec(true);
      tmr.current = setInterval(() => setDur((d) => d + 1), 1000);
    } catch (err) {
      console.error('Mic:', err);
    }
  };

  return (
    <button
      onClick={() => { if (rec) stop(); else start(); }}
      disabled={disabled}
      style={{
        width: 46, height: 46, borderRadius: '50%', position: 'relative',
        border: rec ? '2px solid #EF5350' : '2px solid rgba(79,195,247,0.35)',
        background: rec ? 'rgba(239,83,80,0.15)' : 'rgba(79,195,247,0.06)',
        color: rec ? '#EF5350' : '#4FC3F7',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s', opacity: disabled ? 0.4 : 1, flexShrink: 0,
        animation: rec ? 'mic-pulse 1.2s ease-in-out infinite' : 'none',
      }}
    >
      {rec ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span style={{
            position: 'absolute', top: -8, right: -8, background: '#EF5350',
            color: '#fff', fontSize: '0.55rem', borderRadius: 8, padding: '1px 5px',
            fontFamily: 'monospace',
          }}>{dur}s</span>
        </>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      )}
    </button>
  );
}
