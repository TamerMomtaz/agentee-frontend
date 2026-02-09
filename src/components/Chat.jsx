import { useState, useRef, useEffect } from 'react';
import Avatar from './Avatar.jsx';
import Wave from './Wave.jsx';
import Mic from './Mic.jsx';
import { think, thinkAudio, voiceUrl, getEngineMeta } from '../utils/api.js';

export default function Chat({ opus, messages, setMessages, loading, setLoading }) {
  const [input, setInput] = useState('');
  const endRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (text) => {
    if (!text.trim() || loading) return;
    const userMsg = { role: 'user', content: text.trim(), ts: Date.now() };
    setMessages(p => [...p, userMsg]);
    setInput('');
    setLoading(true);

    const { ok, data, error } = await think(text.trim(), {
      modelOverride: opus ? 'claude-opus' : undefined,
    });

    if (ok && data) {
      setMessages(p => [...p, {
        role: 'assistant',
        content: data.response || data.error || '...',
        engine: opus ? 'claude-opus' : (data.engine || 'unknown'),
        category: data.category || '',
        ts: Date.now(),
        vid: data.voice_id || null,
      }]);
      if (data.voice_id) play(data.voice_id);
    } else {
      setMessages(p => [...p, {
        role: 'assistant',
        content: '🌊 Error: ' + (error || 'Unknown error'),
        engine: 'error', ts: Date.now(),
      }]);
    }
    setLoading(false);
  };

  const sendAudio = async (blob) => {
    if (loading) return;
    setMessages(p => [...p, { role: 'user', content: '🎤 Sending voice...', ts: Date.now(), isVoice: true }]);
    setLoading(true);

    const { ok, data, error } = await thinkAudio(blob);

    if (ok && data) {
      const transcript = data.transcription || data.transcript || '';
      setMessages(p => {
        const u = [...p];
        const li = u.findLastIndex(m => m.role === 'user' && m.isVoice);
        if (li >= 0) {
          u[li] = { ...u[li], content: transcript ? `🎤 "${transcript}"` : '🎤 (sent)' };
        }
        return [...u, {
          role: 'assistant',
          content: data.response || data.error || '...',
          engine: data.engine || 'unknown',
          category: data.category || '',
          ts: Date.now(),
          vid: data.voice_id || null,
        }];
      });
      if (data.voice_id) play(data.voice_id);
    } else {
      setMessages(p => [...p, {
        role: 'assistant',
        content: '🌊 Voice error: ' + (error || 'Unknown'),
        engine: 'error', ts: Date.now(),
      }]);
    }
    setLoading(false);
  };

  const play = async (vid) => {
    try {
      if (audioRef.current) audioRef.current.pause();
      const a = new Audio(voiceUrl(vid));
      audioRef.current = a;
      await a.play();
    } catch (e) { /* silent */ }
  };

  const onKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send(input);
    }
  };

  return (
    <>
      <main className="messages">
        {messages.length === 0 && !loading && (
          <div className="welcome">
            <Avatar size={90} />
            <div>
              <p className="welcome-ar">أنا الموجة</p>
              <p className="welcome-en">Always listening. Tap ✍️ BOOK for writing sessions.</p>
            </div>
            <div className="quick-actions">
              {[
                { t: 'How are you?', e: '🌊' },
                { t: 'Help with RootRise', e: '🚀' },
                { t: 'اكتب لي شعر', e: '✍️' },
                { t: 'What can you do?', e: '🧠' },
              ].map(({ t, e }) => (
                <button key={t} className="quick-btn" onClick={() => send(t)}>{e} {t}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => {
          const meta = getEngineMeta(msg.engine);
          return (
            <div key={i} className={'msg-row ' + msg.role}>
              {msg.role === 'assistant' && <Avatar size={34} />}
              <div className="msg-col">
                <div className={'bubble ' + msg.role}>{msg.content}</div>
                {msg.role === 'assistant' && msg.engine && msg.engine !== 'error' && (
                  <div className="msg-meta">
                    <span
                      className="engine-tag"
                      style={{
                        background: meta.color + '12',
                        color: meta.color,
                        borderColor: meta.color + '20',
                      }}
                    >{meta.icon} {meta.label}</span>
                    {msg.category && <span className="cat-tag">{msg.category}</span>}
                    {msg.vid && (
                      <button className="voice-btn" onClick={() => play(msg.vid)}>🔊</button>
                    )}
                  </div>
                )}
              </div>
              {msg.role === 'user' && <div className="user-avatar">T</div>}
            </div>
          );
        })}

        {loading && (
          <div className="msg-row assistant">
            <Avatar size={34} pulse={true} />
            <div className="loading-bubble">
              <Wave active={true} />
              <div className="loading-text">
                {opus ? '👁️ Deep reasoning...' : '🌊 Thinking...'}
              </div>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <footer className="input-bar">
        <Mic onAudio={sendAudio} disabled={loading} />
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKey}
          placeholder={opus ? 'Deep question...' : 'Talk to The Wave...'}
          rows={1}
          className={'input-field ' + (opus ? 'opus-input' : '')}
        />
        <button
          onClick={() => send(input)}
          disabled={!input.trim() || loading}
          className={'send-btn ' + (opus ? 'opus-send ' : '') + (input.trim() && !loading ? 'active' : '')}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </footer>
    </>
  );
}
