import { useState, useCallback, useMemo } from 'react';
import Wave from './Wave.jsx';
import PanelPreview from './PanelPreview.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import { parseDirection, panelToMarkdown } from '../utils/parseDirection.js';
import { think, saveIdea } from '../utils/api.js';

// --- Constants ---
const MODES = [
  { key: 'dialogue', label: '💬 Dialogue', color: '#4FC3F7' },
  { key: 'narration', label: '📖 Narration', color: '#CE93D8' },
  { key: 'direction', label: '🎬 Direction', color: '#FFD54F' },
  { key: 'idea', label: '💡 Idea', color: '#66BB6A' },
];

const STEPS = [
  { key: 'capture', label: 'Capture', icon: '🎙' },
  { key: 'review', label: 'Review', icon: '✏️' },
  { key: 'organize', label: 'Organize', icon: '🧠' },
  { key: 'export', label: 'Export', icon: '📤' },
];

export default function WritingSession({ onEnd, onChunk }) {
  // === Step state ===
  const [step, setStep] = useState('capture');

  // === Capture state (preserved from v1.2) ===
  const [chunks, setChunks] = useState([]);
  const [mode, setMode] = useState('dialogue');
  const [lang, setLang] = useState('ar-EG');

  // === Review/Edit state ===
  const [editIdx, setEditIdx] = useState(null);
  const [editText, setEditText] = useState('');
  const [editType, setEditType] = useState('');

  // === Organize state ===
  const [organized, setOrganized] = useState('');
  const [organizing, setOrganizing] = useState(false);
  const [orgError, setOrgError] = useState('');

  // === Clipboard feedback ===
  const [copied, setCopied] = useState(false);

  // === Parsed panel previews for direction chunks ===
  const parsedPanels = useMemo(() => {
    const map = {};
    chunks.forEach((c, i) => {
      if (c.type === 'direction') {
        map[i] = parseDirection(c.text);
      }
    });
    return map;
  }, [chunks]);

  // ──────────────────────────────────────
  // SPEECH RECOGNITION (same ref-based fix from Session 4)
  // ──────────────────────────────────────
  const onResult = useCallback((text) => {
    const chunk = { type: mode, text, lang, ts: Date.now() };
    setChunks(p => [...p, chunk]);
    if (onChunk) onChunk(chunk);
  }, [mode, lang, onChunk]);

  const speech = useSpeechRecognition({ lang, continuous: true, onResult });

  const toggleLang = () => {
    const newLang = lang === 'en-US' ? 'ar-EG' : 'en-US';
    if (speech.listening) {
      speech.stop();
      setLang(newLang);
      setTimeout(() => speech.start(newLang), 500);
    } else {
      setLang(newLang);
    }
  };

  const langLabel = lang === 'en-US' ? '🇬🇧 EN' : '🇪🇬 عامية';

  // ──────────────────────────────────────
  // REVIEW & EDIT FUNCTIONS
  // ──────────────────────────────────────
  const startEdit = (idx) => {
    setEditIdx(idx);
    setEditText(chunks[idx].text);
    setEditType(chunks[idx].type);
  };

  const saveEdit = () => {
    if (editIdx === null) return;
    setChunks(p => p.map((c, i) =>
      i === editIdx ? { ...c, text: editText, type: editType } : c
    ));
    setEditIdx(null);
  };

  const cancelEdit = () => { setEditIdx(null); };

  const deleteChunk = (idx) => {
    setChunks(p => p.filter((_, i) => i !== idx));
    if (editIdx === idx) setEditIdx(null);
  };

  const moveChunk = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= chunks.length) return;
    setChunks(p => {
      const arr = [...p];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
    // Track the edit index if we're moving the chunk being edited
    if (editIdx === idx) setEditIdx(newIdx);
    else if (editIdx === newIdx) setEditIdx(idx);
  };

  // ──────────────────────────────────────
  // AI ORGANIZE
  // ──────────────────────────────────────
  const organizeWithAI = async () => {
    setOrganizing(true);
    setOrgError('');
    const raw = chunks.map(c => '[' + c.type.toUpperCase() + '] ' + c.text).join('\n\n');
    const prompt = `You are helping Tee write his trilingual comic book (Egyptian Arabic + English). Organize these raw voice captures into a structured chapter draft with:
1) Dialogue with character names (keep original language as spoken)
2) Narration passages
3) Scene directions and visual notes
4) Suggestions for where illustrations go (comic panels)
5) Keep Egyptian Arabic as-is — do NOT translate it

Raw captures (${chunks.length} segments):
${raw}

Structure into a readable, formatted chapter draft. Use markdown formatting.`;

    const { ok, data } = await think(prompt);
    if (ok && data?.response) {
      setOrganized(data.response);
      // Auto-save organized draft to Library
      saveIdea(data.response, 'book_organized').catch(() => {});
    } else {
      setOrgError('Could not organize — check backend connection and try again.');
    }
    setOrganizing(false);
  };

  // ──────────────────────────────────────
  // EXPORT FUNCTIONS
  // ──────────────────────────────────────
  const getExportContent = () => {
    if (organized) return organized;
    // Fallback: format raw chunks with storyboard panel data for directions
    return chunks.map((c, i) => {
      let line = `**[${c.type.toUpperCase()}]** ${c.text}`;
      // Append storyboard panel layout for direction chunks
      if (parsedPanels[i]) {
        line += '\n' + panelToMarkdown(parsedPanels[i]);
      }
      return line;
    }).join('\n\n');
  };

  const exportFile = (format) => {
    const content = getExportContent();
    const ext = format === 'md' ? 'md' : 'txt';
    const mime = format === 'md' ? 'text/markdown' : 'text/plain';
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentee-book-${new Date().toISOString().slice(0, 10)}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(getExportContent());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (_) {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = getExportContent();
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ──────────────────────────────────────
  // STEP NAVIGATION
  // ──────────────────────────────────────
  const stepIdx = STEPS.findIndex(s => s.key === step);

  const canGoTo = (target) => {
    if (target === 'capture') return true;
    if (target === 'review') return chunks.length > 0;
    if (target === 'organize') return chunks.length > 0;
    if (target === 'export') return chunks.length > 0;
    return false;
  };

  const goToStep = (key) => {
    // Stop recording if leaving capture
    if (step === 'capture' && speech.listening) speech.stop();
    if (canGoTo(key)) setStep(key);
  };

  const nextStep = () => {
    if (stepIdx < STEPS.length - 1) goToStep(STEPS[stepIdx + 1].key);
  };

  const prevStep = () => {
    if (stepIdx > 0) goToStep(STEPS[stepIdx - 1].key);
  };

  // ──────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* ═══ STEP INDICATOR ═══ */}
      <div className="ws-steps">
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isCompleted = i < stepIdx;
          const isClickable = canGoTo(s.key);
          return (
            <div key={s.key} className="ws-step-wrapper">
              {i > 0 && (
                <div className="ws-step-line" style={{
                  background: isCompleted || isActive
                    ? 'rgba(79,195,247,0.4)' : 'rgba(255,255,255,0.06)',
                }} />
              )}
              <button
                className={`ws-step-dot${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
                onClick={() => isClickable && goToStep(s.key)}
                style={{ cursor: isClickable ? 'pointer' : 'default', opacity: isClickable ? 1 : 0.35 }}
                title={s.label}
              >
                {isCompleted ? '✓' : s.icon}
              </button>
              <span className={`ws-step-label${isActive ? ' active' : ''}`}>{s.label}</span>
            </div>
          );
        })}
      </div>

      {/* ═══ STEP 1: CAPTURE ═══ */}
      {step === 'capture' && (
        <>
          {/* Session header row */}
          <div className="ws-toolbar">
            <span className="ws-toolbar-title">✍️ BOOK MODE</span>
            <span style={{ flex: 1 }} />
            <button onClick={toggleLang} className="ws-btn-sm">{langLabel}</button>
          </div>

          {/* Mode selector tabs */}
          <div className="ws-mode-tabs">
            {MODES.map(m => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                className={`ws-mode-tab${mode === m.key ? ' active' : ''}`}
                style={{
                  '--tab-color': m.color,
                  borderColor: mode === m.key ? m.color + '80' : 'rgba(255,255,255,0.08)',
                  background: mode === m.key ? m.color + '15' : 'transparent',
                  color: mode === m.key ? m.color : 'rgba(224,232,240,0.4)',
                  fontWeight: mode === m.key ? '600' : '400',
                  boxShadow: mode === m.key ? `0 0 8px ${m.color}30` : 'none',
                }}
              >{m.label}</button>
            ))}
          </div>

          {/* Active mode indicator */}
          <div className="ws-mode-indicator" style={{ color: MODES.find(m => m.key === mode)?.color }}>
            Recording as: {MODES.find(m => m.key === mode)?.label} • {langLabel}
          </div>

          {/* Chunks captured so far */}
          <div className="ws-chunks-scroll">
            {chunks.map((c, i) => {
              const m = MODES.find(x => x.key === c.type) || MODES[0];
              return (
                <div key={i}>
                  <div className="ws-chunk" style={{ borderColor: m.color + '20', direction: c.lang?.startsWith('ar') ? 'rtl' : 'ltr' }}>
                    <span className="ws-chunk-type" style={{ color: m.color }}>{m.label}</span>
                    <div className="ws-chunk-text">{c.text}</div>
                  </div>
                  {/* Live wireframe panel preview for direction chunks */}
                  {parsedPanels[i] && <PanelPreview panel={parsedPanels[i]} />}
                </div>
              );
            })}

            {/* Live interim while recording */}
            {speech.listening && speech.interim && (
              <div className="ws-chunk ws-chunk-interim" style={{ direction: lang.startsWith('ar') ? 'rtl' : 'ltr' }}>
                {speech.interim}
              </div>
            )}

            {/* Empty state */}
            {chunks.length === 0 && !speech.listening && (
              <div className="ws-empty">
                Select a mode above, then tap 🎙 to start capturing.<br />
                Switch modes while recording — each segment gets tagged.
              </div>
            )}
          </div>

          {/* Record button + navigation */}
          <div className="ws-capture-footer">
            <Wave active={speech.listening} />
            <div className="ws-capture-controls">
              <button
                onClick={() => { if (speech.listening) speech.stop(); else speech.start(lang); }}
                className={`ws-record-btn${speech.listening ? ' recording' : ''}`}
                style={{
                  borderColor: speech.listening ? '#EF5350' : (MODES.find(m => m.key === mode)?.color || '#FFD54F') + '40',
                  color: speech.listening ? '#EF5350' : MODES.find(m => m.key === mode)?.color || '#FFD54F',
                }}
              >
                {speech.listening ? '⏹' : '🎙'}
              </button>
              <span className="ws-capture-count">
                {speech.listening ? '● Recording...' : `${chunks.length} segments`}
              </span>
            </div>
            {chunks.length > 0 && (
              <button onClick={nextStep} className="ws-nav-btn ws-nav-next">
                Review →
              </button>
            )}
          </div>
        </>
      )}

      {/* ═══ STEP 2: REVIEW & EDIT ═══ */}
      {step === 'review' && (
        <>
          <div className="ws-toolbar">
            <span className="ws-toolbar-title">✏️ REVIEW & EDIT</span>
            <span style={{ flex: 1 }} />
            <span className="ws-toolbar-count">{chunks.length} segments</span>
          </div>

          <div className="ws-chunks-scroll">
            {chunks.length === 0 && (
              <div className="ws-empty">No segments to review. Go back to Capture.</div>
            )}

            {chunks.map((c, i) => {
              const m = MODES.find(x => x.key === c.type) || MODES[0];
              const isEditing = editIdx === i;

              return (
                <div key={i} className={`ws-chunk ws-chunk-review${isEditing ? ' editing' : ''}`}
                  style={{ borderColor: m.color + (isEditing ? '50' : '20') }}>

                  {/* ── Editing mode ── */}
                  {isEditing ? (
                    <>
                      {/* Type selector */}
                      <div className="ws-edit-types">
                        {MODES.map(mt => (
                          <button key={mt.key}
                            onClick={() => setEditType(mt.key)}
                            className={`ws-edit-type-btn${editType === mt.key ? ' active' : ''}`}
                            style={{
                              borderColor: editType === mt.key ? mt.color + '60' : 'rgba(255,255,255,0.08)',
                              color: editType === mt.key ? mt.color : 'rgba(224,232,240,0.4)',
                              background: editType === mt.key ? mt.color + '12' : 'transparent',
                            }}
                          >{mt.label}</button>
                        ))}
                      </div>

                      {/* Text editor */}
                      <textarea
                        className="ws-edit-textarea"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        dir={c.lang?.startsWith('ar') ? 'rtl' : 'ltr'}
                        autoFocus
                      />

                      {/* Save/Cancel */}
                      <div className="ws-edit-actions">
                        <button onClick={saveEdit} className="ws-edit-save">✓ Save</button>
                        <button onClick={cancelEdit} className="ws-edit-cancel">✕ Cancel</button>
                      </div>
                    </>
                  ) : (
                    /* ── Display mode ── */
                    <>
                      <div className="ws-chunk-header">
                        <span className="ws-chunk-type" style={{ color: m.color }}>{m.label}</span>
                        <span className="ws-chunk-num">#{i + 1}</span>
                        <span style={{ flex: 1 }} />

                        {/* Action buttons: move up, move down, edit, delete */}
                        <button className="ws-action-btn" onClick={() => moveChunk(i, -1)}
                          disabled={i === 0} title="Move up">↑</button>
                        <button className="ws-action-btn" onClick={() => moveChunk(i, 1)}
                          disabled={i === chunks.length - 1} title="Move down">↓</button>
                        <button className="ws-action-btn ws-action-edit" onClick={() => startEdit(i)}
                          title="Edit">✏️</button>
                        <button className="ws-action-btn ws-action-delete" onClick={() => deleteChunk(i)}
                          title="Delete">🗑</button>
                      </div>
                      <div className="ws-chunk-text" onClick={() => startEdit(i)}
                        style={{ cursor: 'pointer', direction: c.lang?.startsWith('ar') ? 'rtl' : 'ltr' }}>
                        {c.text}
                      </div>
                      {/* Panel preview for direction chunks (also visible in review) */}
                      {parsedPanels[i] && <PanelPreview panel={parsedPanels[i]} />}
                    </>
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation footer */}
          <div className="ws-step-footer">
            <button onClick={prevStep} className="ws-nav-btn ws-nav-prev">← Capture</button>
            <button onClick={() => goToStep('capture')} className="ws-nav-btn ws-nav-add">+ Add More</button>
            <button onClick={nextStep} className="ws-nav-btn ws-nav-next">Organize →</button>
          </div>
        </>
      )}

      {/* ═══ STEP 3: ORGANIZE ═══ */}
      {step === 'organize' && (
        <>
          <div className="ws-toolbar">
            <span className="ws-toolbar-title">🧠 AI ORGANIZE</span>
            <span style={{ flex: 1 }} />
            <span className="ws-toolbar-count">{chunks.length} segments → chapter</span>
          </div>

          <div className="ws-chunks-scroll">
            {/* Preview of what AI will receive */}
            {!organized && !organizing && (
              <div className="ws-org-preview">
                <div className="ws-org-preview-title">📋 Segments to organize:</div>
                {chunks.map((c, i) => {
                  const m = MODES.find(x => x.key === c.type) || MODES[0];
                  return (
                    <div key={i} className="ws-org-preview-item">
                      <span style={{ color: m.color, fontFamily: 'monospace', fontSize: '0.62rem' }}>{m.label}</span>
                      <span className="ws-org-preview-text">{c.text.substring(0, 80)}{c.text.length > 80 ? '...' : ''}</span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Loading state */}
            {organizing && (
              <div className="ws-org-loading">
                <Wave active={true} />
                <div className="ws-org-loading-text">🧠 AI is structuring your chapter...</div>
                <div className="ws-org-loading-sub">Analyzing {chunks.length} segments, preserving original languages</div>
              </div>
            )}

            {/* Error state */}
            {orgError && (
              <div className="ws-org-error">
                ⚠️ {orgError}
              </div>
            )}

            {/* Organized result */}
            {organized && !organizing && (
              <div className="ws-org-result">
                <div className="ws-org-result-title">📝 Organized Chapter Draft</div>
                <div className="ws-org-result-content">{organized}</div>
              </div>
            )}
          </div>

          {/* Action footer */}
          <div className="ws-step-footer">
            <button onClick={prevStep} className="ws-nav-btn ws-nav-prev">← Review</button>
            {!organized ? (
              <button onClick={organizeWithAI} disabled={organizing}
                className="ws-nav-btn ws-nav-organize">
                {organizing ? '⏳ Working...' : '🧠 Organize with AI'}
              </button>
            ) : (
              <>
                <button onClick={() => { setOrganized(''); setOrgError(''); }}
                  className="ws-nav-btn ws-nav-retry">↻ Re-organize</button>
                <button onClick={nextStep} className="ws-nav-btn ws-nav-next">Export →</button>
              </>
            )}
          </div>
        </>
      )}

      {/* ═══ STEP 4: EXPORT ═══ */}
      {step === 'export' && (
        <>
          <div className="ws-toolbar">
            <span className="ws-toolbar-title">📤 EXPORT</span>
            <span style={{ flex: 1 }} />
          </div>

          <div className="ws-chunks-scroll">
            {/* Export preview */}
            <div className="ws-export-preview">
              <div className="ws-export-preview-title">
                {organized ? '📝 Organized Draft' : '📋 Raw Segments'}
              </div>
              <div className="ws-export-preview-content">
                {organized || chunks.map(c => `[${c.type.toUpperCase()}] ${c.text}`).join('\n\n')}
              </div>
            </div>
          </div>

          {/* Export actions */}
          <div className="ws-export-footer">
            <button onClick={prevStep} className="ws-nav-btn ws-nav-prev">← Back</button>
            <div className="ws-export-actions">
              <button onClick={() => exportFile('md')} className="ws-export-btn ws-export-md">
                📄 .md
              </button>
              <button onClick={() => exportFile('txt')} className="ws-export-btn ws-export-txt">
                📃 .txt
              </button>
              <button onClick={copyToClipboard} className="ws-export-btn ws-export-copy">
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
            </div>
            <button onClick={() => onEnd([])} className="ws-nav-btn ws-nav-done">
              ✓ Done
            </button>
          </div>
        </>
      )}
    </div>
  );
}
