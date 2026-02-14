import { useState, useEffect } from 'react';
import './App.css';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import Avatar from './components/Avatar.jsx';
import Splash from './components/Splash.jsx';
import Chat from './components/Chat.jsx';
import WritingSession from './components/WritingSession.jsx';
import Library from './components/Library.jsx';
import { healthCheck, saveIdea } from './utils/api.js';
import NotificationBell from './components/NotificationBell.jsx';
import ModeSwitcher from './components/ModeSwitcher.jsx';
import GuardTeeWidget from './components/GuardTeeWidget.jsx';

export default function App() {
  const [msgs, setMsgs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [splash, setSplash] = useState(true);
  const [opus, setOpus] = useState(false);
  const [mode, setMode] = useState('chat');
  const [saved, setSaved] = useState(false);

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

  const saveChat = async () => {
    const chatContent = msgs.map(m => `[${m.role}] ${m.content}`).join('\n');
    const { ok } = await saveIdea(chatContent, 'saved_chat');
    if (ok) { setSaved(true); setTimeout(() => setSaved(false), 3000); }
  };

  // Each voice chunk auto-saves to backend during capture
  const onWritingChunk = (ch) => {
    saveIdea(ch.text, `book_${ch.type}`).catch(() => {});
  };

  // WritingSession now handles AI organize + export internally.
  // onEnd just means "user is done with Book Mode — go back to chat."
  const onWritingEnd = () => {
    setMode('chat');
  };

  if (splash) return <Splash />;

  const isAlive = status?.status === 'alive';
  const engineCount = status?.components?.mind?.online || '3/3';

  return (
    <div className="app">
      <div className="ambient-glow" />

      <header className="header">
        <Avatar size={38} pulse={loading} />
        <div className="header-info">
          <div className="header-title">A-GENTEE</div>
          <div className="header-status" style={{ color: isAlive ? '#66BB6A' : '#EF5350' }}>
            {isAlive ? '🌊 ' + engineCount + ' engines' : '⚠ offline'}
          </div>
        </div>

        <button
          onClick={() => setMode('chat')}
          className={`opus-toggle${mode === 'chat' ? ' active' : ''}`}
          style={mode === 'chat' ? { borderColor: 'rgba(79,195,247,0.5)', background: 'rgba(79,195,247,0.1)', color: '#4FC3F7' } : {}}
        >💬 CHAT</button>

        <button
          onClick={() => setMode('writing')}
          className={`opus-toggle${mode === 'writing' ? ' active' : ''}`}
          style={mode === 'writing' ? { borderColor: 'rgba(255,213,79,0.5)', background: 'rgba(255,213,79,0.1)', color: '#FFD54F' } : {}}
        >✏️ BOOK</button>

        <button
          onClick={() => setMode('library')}
          className={`opus-toggle${mode === 'library' ? ' active' : ''}`}
          style={mode === 'library' ? { borderColor: 'rgba(102,187,106,0.5)', background: 'rgba(102,187,106,0.1)', color: '#66BB6A' } : {}}
        >📚 LIB</button>

        <button
          onClick={() => setOpus(!opus)}
          className={`opus-toggle${opus ? ' active' : ''}`}
        >{opus ? '👁️ OPUS' : '🧠 SON'}</button>
        
        <ModeSwitcher />
        <NotificationBell />
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

      {mode === 'writing' ? (
        <ErrorBoundary>
          <WritingSession onEnd={onWritingEnd} onChunk={onWritingChunk} />
        </ErrorBoundary>
      ) : mode === 'library' ? (
        <ErrorBoundary>
          <GuardTeeWidget />
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
