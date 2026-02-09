import { useState, useRef, useCallback } from 'react';

export default function Mic({ onAudio, disabled }) {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const mediaRecorder = useRef(null);
  const chunks = useRef([]);
  const timer = useRef(null);
  const startTime = useRef(0);

  const stop = useCallback(() => {
    if (mediaRecorder.current?.state === 'recording') {
      mediaRecorder.current.stop();
    }
    if (timer.current) {
      clearInterval(timer.current);
      timer.current = null;
    }
    setRecording(false);
    setDuration(0);
  }, []);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const recorder = new MediaRecorder(stream, { mimeType });
      chunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks.current, { type: mimeType });
        stream.getTracks().forEach(t => t.stop());
        // Only send if recording was long enough and has data
        if (Date.now() - startTime.current > 800 && blob.size > 1000) {
          onAudio(blob);
        }
      };

      mediaRecorder.current = recorder;
      startTime.current = Date.now();
      recorder.start(250);
      setRecording(true);
      timer.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch (err) {
      console.error('Mic:', err);
    }
  };

  return (
    <button
      onClick={() => recording ? stop() : start()}
      disabled={disabled}
      style={{
        width: 46, height: 46, borderRadius: '50%', position: 'relative',
        border: recording ? '2px solid #EF5350' : '2px solid rgba(79,195,247,0.35)',
        background: recording ? 'rgba(239,83,80,0.15)' : 'rgba(79,195,247,0.06)',
        color: recording ? '#EF5350' : '#4FC3F7',
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.3s', opacity: disabled ? 0.4 : 1, flexShrink: 0,
        animation: recording ? 'mic-pulse 1.2s ease-in-out infinite' : 'none'
      }}
    >
      {recording ? (
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
          <span style={{
            position: 'absolute', top: -8, right: -8,
            background: '#EF5350', color: '#fff', fontSize: '0.55rem',
            borderRadius: 8, padding: '1px 5px', fontFamily: 'monospace'
          }}>{duration}s</span>
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
