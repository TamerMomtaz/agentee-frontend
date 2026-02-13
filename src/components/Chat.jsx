import { useState, useRef, useEffect, useCallback } from 'react';
import Avatar from './Avatar.jsx';
import Mic from './Mic.jsx';
import Wave from './Wave.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import { think, transcribe } from '../utils/api.js';

const QUICK = [
  { emoji: '🌊', text: 'How are you?' },
  { emoji: '🚀', text: 'Help with RootRise' },
  { emoji: '✍', text: 'اكتب لي شعر' },
  { emoji: '🧠', text: 'What can you do?' },
];

// Unique ID generator for message keys
let msgIdCounter = 0;
const nextMsgId = () => `msg-${Date.now()}-${++msgIdCounter}`;

export default function Chat({ opus, messages, setMessages, loading, setLoading }) {
  const [input, setInput] = useState('');
  const [voiceMode, setVoiceMode] = useState(false);
  const [liveChunks, setLiveChunks] = useState([]);
  const [copiedId, setCopiedId] = useState(null);
  const endRef = useRef(null);
  const inputRef = useRef(null);
  const audioRef = useRef(null);
  const sendingRef = useRef(false); // Double-send guard

  // --- Live speech recognition for chat ---
  const onFinalResult = useCallback((text) => {
    setLiveChunks(prev => [...prev, text]);
  }, []);

  const speech = useSpeechRecognition({
    lang: 'en-US',
    continuous: true,
    onResult: onFinalResult,
  });

  // Auto-scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, speech.interim]);

  // Copy message text to clipboard
  const copyMessage = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback for older browsers / insecure contexts
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Send message — with double-send protection
  const send = async (text) => {
    const t = (text || input).trim();
    if (!t || loading || sendingRef.current) return;

    // Lock immediately to prevent double-fire on mobile
    sendingRef.current = true;
    setInput('');

    const userMsgId = nextMsgId();
    setMessages(p => [...p, { id: userMsgId, role: 'user', content: t, ts: Date.now() }]);
    setLoading(true);

    try {
      const { ok, data } = await think(t, { modelOverride: opus ? 'claude-opus' : undefined });
      const reply = ok ? (data?.response || 'No response.') : 'Error connecting to backend.';
      const engine = ok ? (data?.engine || (opus ? 'claude-opus' : 'claude-sonnet')) : 'error';

      const assistantMsgId = nextMsgId();
      setMessages(p => [...p, {
        id: assistantMsgId, role: 'assistant', content: reply, engine,
        category: data?.category || 'general', ts: Date.now(),
      }]);

      // TTS if available
      if (ok && data?.audio_url) {
        try {
          audioRef.current = new Audio(data.audio_url);
          audioRef.current.play().catch(() => {});
        } catch (_) {}
      }
    } finally {
      setLoading(false);
      sendingRef.current = false;
    }
  };

  // Start live voice chat
  const startVoice = () => {
    setVoiceMode(true);
    setLiveChunks([]);
    speech.start('en-US');
  };

  // Stop voice and send accumulated text
  const stopVoice = () => {
    speech.stop();
    setVoiceMode(false);
    const allText = [...liveChunks, speech.interim].filter(Boolean).join(' ').trim();
    setLiveChunks([]);
    if (allText) send(allText);
  };

  // Handle mic audio blob (fallback: send to Whisper backend)
  const onAudioBlob = async (blob) => {
    const { ok, data } = await transcribe(blob);
    if (ok && data?.text) send(data.text);
  };

  // Enter key
  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  // Full combined live text
  const liveText = [...liveChunks, speech.interim].filter(Boolean).join(' ');

  return (
    <>
      <div className="messages">
        {messages.length === 0 && !voiceMode ? (
          <div className="welcome">
            <Avatar size={120} />
            <div className="welcome-ar">أنا الموجة</div>
            <div className="welcome-en">
              Always listening. Tap ✏️ BOOK for writing sessions.
            </div>
            <div className="quick-actions">
              {QUICK.map((q) => (
                <button key={q.text} className="quick-btn" onClick={() => send(q.text)}>
                  {q.emoji} {q.text}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m) => (
              <div key={m.id || m.ts} className={`msg-row ${m.role}`}>
                {m.role === 'assistant' && <Avatar size={34} />}
                {m.role === 'user' && <div className="user-avatar">T</div>}
                <div className="msg-col">
                  <div className={`bubble ${m.role}`}>
                    {m.content}
                    {/* Copy button — shows on every message */}
                    <button
                      onClick={(e) => { e.stopPropagation(); copyMessage(m.content, m.id || m.ts); }}
                      title="Copy"
                      style={{
                        position: 'absolute',
                        top: 6,
                        right: 6,
                        background: 'rgba(255,255,255,0.06)',
                        border: 'none',
                        borderRadius: 6,
                        padding: '3px 6px',
                        cursor: 'pointer',
                        fontSize: '0.65rem',
                        color: copiedId === (m.id || m.ts) ? '#66BB6A' : 'rgba(255,255,255,0.3)',
                        opacity: copiedId === (m.id || m.ts) ? 1 : 0,
                        transition: 'opacity 0.2s, color 0.2s',
                      }}
                      className="copy-btn"
                    >
                      {copiedId === (m.id || m.ts) ? '✓ Copied' : '📋'}
                    </button>
                  </div>
                  {m.role === 'assistant' && m.engine && (
                    <div className="msg-meta">
                      <span
                        className="engine-tag"
                        style={{
                          color: m.engine?.includes('opus') ? '#F48FB1' : m.engine?.includes('gemini') ? '#CE93D8' : '#4FC3F7',
                          borderColor: m.engine?.includes('opus') ? 'rgba(244,143,177,0.3)' : m.engine?.includes('gemini') ? 'rgba(206,147,216,0.3)' : 'rgba(79,195,247,0.3)',
                        }}
                      >
                        {m.engine}
                      </span>
                      {m.category && m.category !== 'general' && (
                        <span className="cat-tag">{m.category}</span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {loading && (
              <div className="msg-row assistant">
                <Avatar size={34} pulse />
                <div className="msg-col">
                  <div className="loading-bubble">
                    <Wave active={true} />
                    <div className="loading-text">
                      {opus ? '🔮 Opus thinking deeply...' : '🌊 The Wave is thinking...'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* LIVE TRANSCRIPTION */}
        {voiceMode && (
          <div className="live-transcription">
            <div className="dot" />
            <div className="text">
              {liveText || <span className="interim">Listening...</span>}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input bar */}
      <div className="input-bar">
        {speech.supported ? (
          <button
            onClick={() => { if (voiceMode) stopVoice(); else startVoice(); }}
            disabled={loading}
            style={{
              width: 46, height: 46, borderRadius: '50%', flexShrink: 0,
              border: voiceMode ? '2px solid #EF5350' : '2px solid rgba(79,195,247,0.35)',
              background: voiceMode ? 'rgba(239,83,80,0.15)' : 'rgba(79,195,247,0.06)',
              color: voiceMode ? '#EF5350' : '#4FC3F7',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.3s', opacity: loading ? 0.4 : 1,
              animation: voiceMode ? 'mic-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            {voiceMode ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z" />
                <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
              </svg>
            )}
          </button>
        ) : (
          <Mic onAudio={onAudioBlob} disabled={loading} />
        )}

        <input
          ref={inputRef}
          className={`input-field${opus ? ' opus-input' : ''}`}
          value={voiceMode ? liveText : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={voiceMode ? '🎤 Speaking...' : 'Talk to The Wave...'}
          readOnly={voiceMode}
          disabled={loading}
        />

        <button
          className={`send-btn${opus ? ' opus-send' : ''}${(input.trim() || voiceMode) && !loading ? ' active' : ''}`}
          onClick={() => { if (voiceMode) stopVoice(); else send(); }}
          disabled={(!input.trim() && !voiceMode) || loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </div>
    </>
  );
}
