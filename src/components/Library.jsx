import { useState, useEffect } from 'react';
import { getLibrary, exportAll } from '../utils/api.js';

const TABS = ['All', 'Book', 'Chats', 'Ideas'];

export default function Library() {
  const [items, setItems] = useState([]);
  const [tab, setTab] = useState('All');
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    const { ok, data } = await getLibrary();
    if (ok && Array.isArray(data?.ideas)) setItems(data.ideas);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = items.filter(item => {
    if (tab === 'All') return true;
    if (tab === 'Book') return item.content?.startsWith('BOOK|');
    if (tab === 'Chats') return item.content?.startsWith('SAVED_CHAT|');
    if (tab === 'Ideas') return !item.content?.startsWith('BOOK|') && !item.content?.startsWith('SAVED_CHAT|');
    return true;
  });

  const handleExport = async () => {
    setExporting(true);
    const { ok, data } = await exportAll();
    if (ok && data?.url) window.open(data.url, '_blank');
    else if (ok && data?.content) {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `agentee-library-${Date.now()}.json`; a.click();
      URL.revokeObjectURL(url);
    }
    setExporting(false);
  };

  const parseItem = (item) => {
    const c = item.idea || item.content || '';
    const cat = item.category || '';
    if (cat.startsWith('book_') || c.startsWith('BOOK|')) {
      const parts = c.startsWith('BOOK|') ? c.split('|') : ['', cat.replace('book_', ''), c];
      return { type: '📖', label: parts[1] || 'Book', text: parts.slice(2).join('|') || c, color: '#FFD54F' };
    }
    if (cat === 'saved_chat' || c.startsWith('SAVED_CHAT|')) {
      const text = c.startsWith('SAVED_CHAT|') ? c.substring(11, 80) : c.substring(0, 80);
      return { type: '💬', label: 'Chat', text: text + '...', color: '#4FC3F7' };
    }
    return { type: '💡', label: 'Idea', text: c.substring(0, 120), color: '#66BB6A' };
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Library header */}
      <div style={{
        padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
        borderBottom: '1px solid rgba(79,195,247,0.08)',
      }}>
        <div>
          <div style={{ fontSize: '1rem', color: '#66BB6A', fontWeight: 600 }}>📚 Library</div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(224,232,240,0.35)', fontFamily: 'monospace' }}>
            {items.length} saved items
          </div>
        </div>
        <span style={{ flex: 1 }} />
        <button onClick={load} style={{
          padding: '5px 12px', borderRadius: 12, border: '1px solid rgba(79,195,247,0.2)',
          background: 'rgba(79,195,247,0.06)', color: '#4FC3F7',
          fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace',
        }}>🔄 Refresh</button>
        <button onClick={handleExport} disabled={exporting} style={{
          padding: '5px 12px', borderRadius: 12, border: '1px solid rgba(102,187,106,0.2)',
          background: 'rgba(102,187,106,0.06)', color: '#66BB6A',
          fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace',
          opacity: exporting ? 0.5 : 1,
        }}>{exporting ? '⏳' : '📦'} Export All</button>
      </div>

      {/* Tabs */}
      <div style={{ padding: '8px 16px', display: 'flex', gap: 6 }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '5px 14px', borderRadius: 16, fontSize: '0.72rem',
              border: tab === t ? '1px solid rgba(79,195,247,0.4)' : '1px solid rgba(255,255,255,0.06)',
              background: tab === t ? 'rgba(79,195,247,0.08)' : 'transparent',
              color: tab === t ? '#4FC3F7' : 'rgba(224,232,240,0.35)',
              cursor: 'pointer', transition: 'all 0.2s',
            }}
          >
            {t === 'Book' && '📖 '}{t === 'Chats' && '💬 '}{t === 'Ideas' && '💡 '}{t}
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 16px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(224,232,240,0.3)', fontSize: '0.82rem' }}>
            Loading...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 8 }}>
              {tab === 'Book' ? '📖' : tab === 'Chats' ? '💬' : tab === 'Ideas' ? '💡' : '📚'}
            </div>
            <div style={{ color: 'rgba(224,232,240,0.3)', fontSize: '0.82rem' }}>
              No {tab.toLowerCase()} items yet.
            </div>
          </div>
        ) : (
          filtered.map((item, i) => {
            const p = parseItem(item);
            return (
              <div key={item.id || i} style={{
                padding: '10px 14px', marginBottom: 8, borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${p.color}15`,
                transition: 'all 0.2s',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: '0.72rem' }}>{p.type}</span>
                  <span style={{
                    fontSize: '0.6rem', color: p.color, fontFamily: 'monospace',
                    padding: '1px 8px', borderRadius: 8, border: `1px solid ${p.color}30`,
                  }}>{p.label}</span>
                  {item.created_at && (
                    <span style={{ fontSize: '0.55rem', color: 'rgba(224,232,240,0.2)', fontFamily: 'monospace', marginLeft: 'auto' }}>
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <div style={{
                  fontSize: '0.82rem', color: 'rgba(224,232,240,0.7)', lineHeight: 1.5,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>{p.text}</div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
