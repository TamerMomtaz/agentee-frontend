import { useState, useEffect, useRef } from 'react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Avatar from './components/Avatar.jsx';
import Splash from './components/Splash.jsx';
import Chat from './components/Chat.jsx';
import WritingSession from './components/WritingSession.jsx';
import Library from './components/Library.jsx';
import { healthCheck, think, saveIdea } from './utils/api.js';

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [splash, setSplash] = useState(true);
  const [opus, setOpus] = useState(false);
  const [mode, setMode] = useState('chat'); // 'chat' | 'writing' | 'library'
  const [saved, setSaved] = useState(false);
  const audioRef = useRef(null);

  // Health check on mount
  useEffect(() => {
    healthCheck()
      .then(({ data }) => {
        setStatus(data);
        setTimeout(() => setSplash(false), 2400);
      })
      .catch(() => {
        setStatus({ status: 'offline' });
        setTimeout(() => setSplash(false), 2400);
      });
  }, []);

  // Save chat to ideas
  const saveChat = async () => {
    const { ok } = await saveIdea(
      'SAVED_CHAT|' + new Date().toISOString() + '|' + JSON.stringify(msgs)
    );
    if (ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  };

  // Writing session chunk → save to backend
  const onWritingChunk = (ch) => {
    saveIdea('BOOK|' + ch.type + '|' + ch.text).catch(() => {});
  };

  // Writing session end → send to Opus for organization
  const onWritingEnd = async (chunks) => {
    setMode('chat');
    if (!chunks.length) return;

    const raw = chunks.map(c => '[' + c.type.toUpperCase() + '] ' + c.text).join('\n\n');
    const prompt = `You are helping Tee write his trilingual comic book (Egyptian Arabic + English). Organize these raw voice captures into a structured chapter draft with:
1) Dialogue with character names
2) Narration
3) Scene directions
4) Keep original language as spoken
5) Suggest where illustrations go (comic panels)

Raw captures:
${raw}

Structure into a readable chapter draft.`;

    setMsgs(p => [...p, {
      role: 'user',
      content: '✍️ Session ended — ' + chunks.length + ' segments. Organizing...',
      ts: Date.now(),
    }]);
    setLoading(true);

    const { ok, data } = await think(prompt, { modelOverride: 'claude-opus' });
    setMsgs(p => [...p, {
      role: 'assistant',
      content: ok ? (data?.response || 'Could not organize.') : 'Error organizing session.',
      engine: 'claude-opus',
      category: 'book-draft',
      ts: Date.now(),
    }]);
    setLoading(false);
  };

  // Splash screen
  if (splash) return <Splash />;

  const isAlive = status?.status === 'alive';
  const engineCount = status?.components?.mind?.online || '3/3';

  return (
    <div className="app">
      <div className="ambient-glow" />

      {/* Header */}
      <header className="header">
        <Avatar size={38} pulse={loading} />
        <div className="header-info">
          <div className="header-title">A-GENTEE</div>
          <div className="header-status" style={{ color: isAlive ? '#66BB6A' : '#EF5350' }}>
            {isAlive ? '🌊 ' + engineCount + ' engines' : '⚠ offline'}
          </div>
        </div>

        {/* Mode toggles */}
        <button
          onClick={() => setMode(mode === 'writing' ? 'chat' : 'writing')}
          style={{
            padding: '5px 10px', borderRadius: 14, fontSize: '0.6rem',
            fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
            border: mode === 'writing' ? '1px solid rgba(255,213,79,0.5)' : '1px solid rgba(79,195,247,0.15)',
            background: mode === 'writing' ? 'rgba(255,213,79,0.1)' : 'transparent',
            color: mode === 'writing' ? '#FFD54F' : 'rgba(79,195,247,0.4)',
          }}
        >{mode === 'writing' ? '✍️ BOOK' : '💬 CHAT'}</button>

        <button
          onClick={() => setMode(mode === 'library' ? 'chat' : 'library')}
          style={{
            padding: '5px 10px', borderRadius: 14, fontSize: '0.6rem',
            fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
            border: mode === 'library' ? '1px solid rgba(102,187,106,0.5)' : '1px solid rgba(79,195,247,0.15)',
            background: mode === 'library' ? 'rgba(102,187,106,0.1)' : 'transparent',
            color: mode === 'library' ? '#66BB6A' : 'rgba(79,195,247,0.4)',
          }}
        >{mode === 'library' ? '📚 LIB' : '📚'}</button>

        <button
          onClick={() => setOpus(!opus)}
          style={{
            padding: '5px 10px', borderRadius: 14, fontSize: '0.6rem',
            fontFamily: 'monospace', fontWeight: 600, cursor: 'pointer',
            border: opus ? '1px solid rgba(244,143,177,0.5)' : '1px solid rgba(79,195,247,0.15)',
            background: opus ? 'rgba(244,143,177,0.12)' : 'transparent',
            color: opus ? '#F48FB1' : 'rgba(79,195,247,0.4)',
          }}
        >{opus ? '👁️ OPUS' : '🧠 SON'}</button>

        {msgs.length > 0 && mode === 'chat' && (
          <button
            onClick={saveChat}
            style={{
              padding: '5px 8px', borderRadius: 14, fontSize: '0.7rem',
              border: 'none', cursor: 'pointer',
              background: saved ? 'rgba(102,187,106,0.15)' : 'transparent',
              color: saved ? '#66BB6A' : 'rgba(79,195,247,0.4)',
            }}
          >{saved ? '✅' : '💾'}</button>
        )}
      </header>

      {/* Views — each wrapped in ErrorBoundary */}
      {mode === 'writing' ? (
        <ErrorBoundary>
          <WritingSession onEnd={onWritingEnd} onChunk={onWritingChunk} />
        </ErrorBoundary>
      ) : mode === 'library' ? (
        <ErrorBoundary>
          <Library />
        </ErrorBoundary>
      ) : (
        <ErrorBoundary>
          <Chat
            opus={opus}
            messages={msgs}
            setMessages={setMsgs}
            loading={loading}
            setLoading={setLoading}
          />
        </ErrorBoundary>
      )}
    </div>
  );
}
