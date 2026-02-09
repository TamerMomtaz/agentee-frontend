import { useState, useRef, useEffect, useCallback } from 'react';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import { saveIdea } from '../utils/api.js';
import Wave from './Wave.jsx';

export default function WritingSession({ onEnd, onChunk }) {
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [paragraphs, setParagraphs] = useState([]);
  const [interim, setInterim] = useState('');
  const [langKey, setLangKey] = useState('ar'); // 'ar' or 'en'
  const [wordCount, setWordCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const timerRef = useRef(null);
  const autoSaveRef = useRef(null);
  const scrollRef = useRef(null);
  const activeRef = useRef(false);

  // --- The fixed speech recognition hook ---
  const speech = useSpeechRecognition({
    onResult: useCallback((text) => {
      setInterim(text);
    }, []),

    onFinal: useCallback((text) => {
      setParagraphs(prev => {
        const updated = [...prev];
        if (updated.length === 0) {
          updated.push(text);
        } else {
          updated[updated.length - 1] += ' ' + text;
        }
        return updated;
      });
      setInterim('');

      // Send chunk to parent
      if (text.trim()) {
        onChunk?.({ text: text.trim(), ts: Date.now(), type: 'narration' });
      }
    }, [onChunk]),

    onError: useCallback((msg) => {
      setError(msg);
    }, []),
  });

  // Auto-scroll as text appears
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [paragraphs, interim]);

  // Word count
  useEffect(() => {
    const all = paragraphs.join(' ') + ' ' + interim;
    setWordCount(all.trim().split(/\s+/).filter(w => w).length);
  }, [paragraphs, interim]);

  // --- Language switch (THE FIX — no crash) ---
  const switchLang = (newLang) => {
    setLangKey(newLang);
    if (activeRef.current) {
      speech.switchLanguage(newLang);
    }
  };

  const startSession = () => {
    activeRef.current = true;
    setActive(true);
    setError(null);
    setParagraphs([]);
    setInterim('');
    setElapsed(0);

    speech.start(langKey === 'en' ? 'en-US' : 'ar-EG');

    // Timer
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

    // Auto-save every 60 seconds
    autoSaveRef.current = setInterval(() => {
      setParagraphs(prev => {
        const fullText = prev.filter(p => p.trim()).join('\n\n');
        if (fullText.trim()) {
          saveIdea('BOOK|session|' + fullText).catch(() => {});
        }
        return prev;
      });
    }, 60000);
  };

  const stopSession = () => {
    activeRef.current = false;
    speech.stop();

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (autoSaveRef.current) { clearInterval(autoSaveRef.current); autoSaveRef.current = null; }

    setActive(false);
    setInterim('');

    const finalParagraphs = paragraphs.filter(p => p.trim());
    if (finalParagraphs.length > 0) {
      const fullText = finalParagraphs.join('\n\n');
      saveIdea('BOOK|session_complete|' + fullText)
        .then(() => setSaved(true))
        .catch(() => {});

      const chunks = finalParagraphs.map(p => ({ text: p, ts: Date.now(), type: 'narration' }));
      onEnd(chunks);
    } else {
      onEnd([]);
    }
  };

  const newParagraph = () => {
    setParagraphs(prev => [...prev, '']);
  };

  const copyAll = () => {
    const text = paragraphs.filter(p => p.trim()).join('\n\n');
    navigator.clipboard?.writeText(text)
      .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
      .catch(() => {});
  };

  const exportTxt = () => {
    const text = paragraphs.filter(p => p.trim()).join('\n\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'writing-session-' + new Date().toISOString().slice(0, 16) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = s => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Playfair Display',serif", color: '#FFD54F' }}>
            ✍️ Writing Session
          </div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(79,195,247,0.6)', fontFamily: 'monospace' }}>
            {active
              ? `Live — ${langKey === 'ar' ? 'عربي' : 'English'}${speech.isStarting ? ' (connecting...)' : ''}`
              : 'Tap Start to begin dictating'}
          </div>
        </div>
        {active && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#EF5350', animation: 'mic-pulse 1.2s infinite' }} />
            <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#EF5350' }}>{fmt(elapsed)}</span>
          </div>
        )}
      </div>

      {/* Language toggle — works during session */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: '0.6rem', color: 'rgba(224,232,240,0.3)', fontFamily: 'monospace' }}>LANG:</span>
        {[['ar', '🇪🇬 عربي'], ['en', '🇺🇸 English']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchLang(key)}
            style={{
              padding: '5px 12px', borderRadius: 10, fontSize: '0.7rem',
              fontFamily: 'monospace', fontWeight: 600,
              border: langKey === key ? '1px solid rgba(255,213,79,0.5)' : '1px solid rgba(79,195,247,0.15)',
              background: langKey === key ? 'rgba(255,213,79,0.12)' : 'transparent',
              color: langKey === key ? '#FFD54F' : 'rgba(224,232,240,0.4)',
              cursor: 'pointer', transition: 'all 0.2s'
            }}
          >{label}</button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: 10, borderRadius: 10,
          background: 'rgba(239,83,80,0.1)', border: '1px solid rgba(239,83,80,0.2)',
          color: '#EF5350', fontSize: '0.8rem'
        }}>⚠ {error}</div>
      )}

      {/* Browser support warning */}
      {!speech.isSupported && (
        <div style={{
          padding: 10, borderRadius: 10,
          background: 'rgba(255,213,79,0.1)', border: '1px solid rgba(255,213,79,0.2)',
          color: '#FFD54F', fontSize: '0.8rem'
        }}>⚠ Speech recognition not available. Use Chrome on your Samsung for voice input.</div>
      )}

      {/* Start/Stop */}
      {!active ? (
        <button
          onClick={startSession}
          disabled={!speech.isSupported}
          style={{
            padding: '14px 24px', borderRadius: 16,
            border: '1px solid rgba(255,213,79,0.3)',
            background: 'rgba(255,213,79,0.08)', color: '#FFD54F',
            fontSize: '0.9rem', cursor: speech.isSupported ? 'pointer' : 'not-allowed',
            fontWeight: 600, opacity: speech.isSupported ? 1 : 0.5
          }}
        >🎤 Start Writing Session</button>
      ) : (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={stopSession}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 16,
              border: '1px solid rgba(239,83,80,0.3)',
              background: 'rgba(239,83,80,0.1)', color: '#EF5350',
              fontSize: '0.85rem', cursor: 'pointer', fontWeight: 600
            }}
          >⏹️ End Session</button>
          <button
            onClick={newParagraph}
            style={{
              padding: '12px 16px', borderRadius: 16,
              border: '1px solid rgba(79,195,247,0.2)',
              background: 'rgba(79,195,247,0.06)', color: '#4FC3F7',
              fontSize: '0.85rem', cursor: 'pointer'
            }}
          >¶ New ¶</button>
        </div>
      )}

      {/* Live text area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1, overflowY: 'auto', padding: 12, borderRadius: 14,
          background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(79,195,247,0.08)',
          minHeight: 120
        }}
      >
        {paragraphs.length === 0 && !interim && !active && (
          <div style={{ textAlign: 'center', padding: 30, color: 'rgba(224,232,240,0.2)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎤</div>
            <div style={{ fontSize: '0.85rem' }}>Your words will appear here as you speak.</div>
            <div style={{ fontSize: '0.7rem', marginTop: 4 }}>No delays. No truncation. Just your voice, live.</div>
          </div>
        )}

        {paragraphs.length === 0 && !interim && active && (
          <div style={{ textAlign: 'center', padding: 20, color: 'rgba(224,232,240,0.3)' }}>
            <Wave active={true} />
            <div style={{ marginTop: 8, fontSize: '0.85rem' }}>Listening... start speaking.</div>
          </div>
        )}

        {paragraphs.map((p, i) =>
          p.trim() ? (
            <p key={i} style={{
              margin: '0 0 12px 0', fontSize: '0.95rem', lineHeight: 1.8,
              color: '#E0E8F0', fontFamily: "'Georgia',serif"
            }}>{p}</p>
          ) : (
            <div key={i} style={{ height: 8 }} />
          )
        )}

        {interim && (
          <span style={{
            fontSize: '0.95rem', lineHeight: 1.8,
            color: 'rgba(79,195,247,0.6)', fontFamily: "'Georgia',serif",
            fontStyle: 'italic'
          }}>{interim}</span>
        )}
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(79,195,247,0.3)'
      }}>
        <span>{wordCount} words • {paragraphs.filter(p => p.trim()).length} paragraphs</span>
        {paragraphs.some(p => p.trim()) && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={copyAll}
              style={{
                padding: '3px 8px', borderRadius: 8,
                border: '1px solid rgba(79,195,247,0.15)',
                background: 'transparent', color: saved ? '#66BB6A' : '#4FC3F7',
                fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'monospace'
              }}
            >{saved ? '✅' : '📋 Copy'}</button>
            <button
              onClick={exportTxt}
              style={{
                padding: '3px 8px', borderRadius: 8,
                border: '1px solid rgba(102,187,106,0.15)',
                background: 'transparent', color: '#66BB6A',
                fontSize: '0.6rem', cursor: 'pointer', fontFamily: 'monospace'
              }}
            >📥 Export</button>
          </div>
        )}
      </div>
    </div>
  );
}
