import { useState, useEffect } from 'react';
import { getIdeas, deleteIdea } from '../utils/api.js';
import Wave from './Wave.jsx';

function parseItem(item) {
  const idea = item.idea || item.content || item.text || '';
  const id = item.id || item.uuid || Math.random().toString(36).slice(2);
  const ts = item.created_at || item.timestamp || item.ts || '';

  if (idea.startsWith('SAVED_CHAT|')) {
    const parts = idea.split('|');
    const chatTs = parts[1] || ts;
    let messages = [];
    try { messages = JSON.parse(parts.slice(2).join('|')); } catch (e) {}
    return {
      id, type: 'chat', ts: chatTs, messages, raw: idea,
      label: '💬 Chat — ' + new Date(chatTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    };
  }

  if (idea.startsWith('BOOK|')) {
    const parts = idea.split('|');
    const chunkType = parts[1] || 'narration';
    const text = parts.slice(2).join('|');
    const icons = { dialogue: '💬', narration: '📖', direction: '🎬', session: '📝', session_complete: '✅' };
    return {
      id, type: 'book', chunkType, text, ts, raw: idea,
      label: (icons[chunkType] || '📖') + ' ' + (chunkType === 'session_complete' ? 'Complete Session' : chunkType.charAt(0).toUpperCase() + chunkType.slice(1)),
    };
  }

  return { id, type: 'idea', text: idea, ts, raw: idea, label: '💡 Idea' };
}

export default function Library() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('all');
  const [copied, setCopied] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const { ok, data, error: err } = await getIdeas();
    if (ok && data) {
      const raw = data.ideas || data.data || data || [];
      setItems(raw.map(parseItem).reverse());
    } else {
      setError(err || 'Failed to load');
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const grouped = {};
  filtered.forEach(item => {
    const date = item.ts
      ? new Date(item.ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      : 'Unknown';
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(item);
  });

  const copyText = (text, id) => {
    navigator.clipboard?.writeText(text)
      .then(() => { setCopied(id); setTimeout(() => setCopied(null), 2000); })
      .catch(() => {});
  };

  const exportAll = () => {
    let output = '# A-GENTEE Writing Archive\n# Exported: ' + new Date().toLocaleString() + '\n\n';
    Object.entries(grouped).forEach(([date, dateItems]) => {
      output += '## ' + date + '\n\n';
      dateItems.forEach(item => {
        if (item.type === 'book') {
          output += '[' + (item.chunkType || '').toUpperCase() + ']\n' + item.text + '\n\n';
        } else if (item.type === 'chat' && item.messages) {
          item.messages.forEach(m => {
            output += (m.role === 'user' ? 'TEE: ' : 'AGENTEE: ') + m.content + '\n';
          });
          output += '\n---\n\n';
        } else if (item.type === 'idea') {
          output += item.text + '\n\n';
        }
      });
    });
    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'agentee-writing-' + new Date().toISOString().slice(0, 10) + '.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = async (id) => {
    setDeleting(id);
    await deleteIdea(id);
    setItems(p => p.filter(i => i.id !== id));
    setDeleting(null);
  };

  const typeColors = {
    dialogue: '#4FC3F7', narration: '#FFD54F', direction: '#80CBC4',
    chat: '#CE93D8', idea: '#90CAF9', session: '#66BB6A', session_complete: '#66BB6A',
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12, flex: 1, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: "'Playfair Display',serif", color: '#FFD54F' }}>📚 Library</div>
          <div style={{ fontSize: '0.65rem', color: 'rgba(79,195,247,0.6)', fontFamily: 'monospace' }}>{items.length} saved items</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={load} style={{ padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(79,195,247,0.2)', background: 'transparent', color: '#4FC3F7', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace' }}>🔄 Refresh</button>
          {items.length > 0 && (
            <button onClick={exportAll} style={{ padding: '4px 10px', borderRadius: 10, border: '1px solid rgba(102,187,106,0.3)', background: 'rgba(102,187,106,0.08)', color: '#66BB6A', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace' }}>📥 Export All</button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6 }}>
        {[['all', 'All'], ['book', '📖 Book'], ['chat', '💬 Chats'], ['idea', '💡 Ideas']].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              padding: '4px 10px', borderRadius: 10, fontSize: '0.65rem', fontFamily: 'monospace',
              border: filter === key ? '1px solid rgba(255,213,79,0.4)' : '1px solid rgba(79,195,247,0.1)',
              background: filter === key ? 'rgba(255,213,79,0.1)' : 'transparent',
              color: filter === key ? '#FFD54F' : 'rgba(224,232,240,0.4)', cursor: 'pointer',
            }}
          >{label}</button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(79,195,247,0.4)' }}>
            <Wave active={true} />
            <div style={{ marginTop: 8, fontSize: '0.8rem', fontFamily: 'monospace' }}>Loading your writing...</div>
          </div>
        )}

        {error && (
          <div style={{ textAlign: 'center', padding: 20, color: '#EF5350', fontSize: '0.8rem' }}>
            ⚠ {error}<br />
            <button onClick={load} style={{ marginTop: 8, padding: '6px 16px', borderRadius: 10, border: '1px solid #EF5350', background: 'transparent', color: '#EF5350', cursor: 'pointer', fontSize: '0.75rem' }}>Retry</button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'rgba(224,232,240,0.3)' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>📭</div>
            <div style={{ fontSize: '0.85rem' }}>No {filter === 'all' ? 'items' : filter + ' items'} yet.</div>
          </div>
        )}

        {!loading && Object.entries(grouped).map(([date, dateItems]) => (
          <div key={date}>
            <div style={{
              fontSize: '0.6rem', fontFamily: 'monospace', color: 'rgba(79,195,247,0.3)',
              padding: '8px 0 4px', borderBottom: '1px solid rgba(79,195,247,0.06)',
              marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1,
            }}>{date}</div>

            {dateItems.map(item => {
              const isOpen = expanded === item.id;
              const borderColor = (typeColors[item.chunkType || item.type] || '#4FC3F7') + '20';

              return (
                <div key={item.id} style={{
                  marginBottom: 4, borderRadius: 12,
                  border: '1px solid ' + borderColor,
                  background: isOpen ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.02)',
                  transition: 'all 0.2s', overflow: 'hidden',
                }}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : item.id)}
                    style={{ padding: '10px 12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span style={{ fontSize: '0.75rem' }}>{item.label.split(' ')[0]}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.75rem', color: '#E0E8F0', fontWeight: 500 }}>
                        {item.type === 'book' ? (item.text?.slice(0, 80) + (item.text?.length > 80 ? '...' : '')) :
                         item.type === 'chat' ? (item.messages?.length || 0) + ' messages' :
                         item.text?.slice(0, 80) || item.label}
                      </div>
                    </div>
                    <span style={{
                      fontSize: '0.7rem', color: 'rgba(224,232,240,0.2)',
                      transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    }}>▾</span>
                  </div>

                  {isOpen && (
                    <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(79,195,247,0.06)' }}>
                      {item.type === 'book' && (
                        <div style={{ padding: '10px 0', fontSize: '0.85rem', lineHeight: 1.7, color: '#E0E8F0', whiteSpace: 'pre-wrap' }}>{item.text}</div>
                      )}
                      {item.type === 'chat' && item.messages && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
                          {item.messages.map((m, mi) => (
                            <div key={mi} style={{
                              padding: '6px 10px', borderRadius: 8,
                              background: m.role === 'user' ? 'rgba(79,195,247,0.08)' : 'rgba(255,213,79,0.06)',
                              borderLeft: m.role === 'user' ? '3px solid #4FC3F7' : '3px solid #FFD54F',
                            }}>
                              <div style={{ fontSize: '0.6rem', fontFamily: 'monospace', color: m.role === 'user' ? '#4FC3F7' : '#FFD54F', marginBottom: 2 }}>{m.role === 'user' ? 'TEE' : 'A-GENTEE'}</div>
                              <div style={{ fontSize: '0.8rem', lineHeight: 1.5, color: '#E0E8F0' }}>{m.content}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {item.type === 'idea' && (
                        <div style={{ padding: '10px 0', fontSize: '0.85rem', lineHeight: 1.7, color: '#E0E8F0', whiteSpace: 'pre-wrap' }}>{item.text}</div>
                      )}

                      <div style={{ display: 'flex', gap: 6, paddingTop: 8 }}>
                        <button
                          onClick={() => {
                            const text = item.type === 'chat'
                              ? (item.messages || []).map(m => (m.role === 'user' ? 'TEE: ' : 'AGENTEE: ') + m.content).join('\n')
                              : item.text || item.raw;
                            copyText(text, item.id);
                          }}
                          style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(79,195,247,0.2)', background: 'transparent', color: copied === item.id ? '#66BB6A' : '#4FC3F7', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace' }}
                        >{copied === item.id ? '✅ Copied' : '📋 Copy'}</button>

                        <button
                          onClick={() => { if (confirm('Delete this item?')) handleDelete(item.id); }}
                          style={{ padding: '4px 10px', borderRadius: 8, border: '1px solid rgba(239,83,80,0.2)', background: 'transparent', color: deleting === item.id ? 'rgba(239,83,80,0.3)' : '#EF5350', fontSize: '0.65rem', cursor: 'pointer', fontFamily: 'monospace', marginLeft: 'auto' }}
                        >{deleting === item.id ? '...' : '🗑'}</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
