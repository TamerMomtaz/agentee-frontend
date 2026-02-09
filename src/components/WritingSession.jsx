import { useState, useCallback } from 'react';
import Wave from './Wave.jsx';
import PanelBuilder from './PanelBuilder.jsx';
import useSpeechRecognition from '../hooks/useSpeechRecognition.js';
import { parseDirection, panelToMarkdown } from '../utils/parseDirection.js';
import { panelToSVGString, generateStoryboardHTML } from '../utils/panelToSVGString.js';
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
  // AI-suggested panel configs (from organize step)
  // Array of { panelNumber, layout, background, characters, bubbles, directionText }
  const [aiPanels, setAiPanels] = useState([]);

  // === Clipboard feedback ===
  const [copied, setCopied] = useState(false);

  // === Panel configurations for direction chunks ===
  // Key: chunk index, Value: panel data object (from PanelBuilder)
  // Parser runs to provide initial suggestions, user overrides via PanelBuilder
  const [panelConfigs, setPanelConfigs] = useState({});

  const getPanelSuggestion = (text) => parseDirection(text);

  const updatePanelConfig = (chunkIdx, panelData) => {
    setPanelConfigs(prev => ({ ...prev, [chunkIdx]: panelData }));
  };

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
    setAiPanels([]);
    const raw = chunks.map(c => '[' + c.type.toUpperCase() + '] ' + c.text).join('\n\n');

    // Enhanced prompt: request BOTH organized text AND structured panel configs
    const prompt = `You are helping Tee write his trilingual comic book (Egyptian Arabic + English). Organize these raw voice captures into a structured chapter draft.

IMPORTANT: Your response MUST have TWO sections separated by the exact marker "===PANELS===".

SECTION 1 (before the marker): The organized chapter draft in markdown with:
1) Dialogue with character names (keep original language as spoken)
2) Narration passages
3) Scene directions and visual notes
4) Keep Egyptian Arabic as-is — do NOT translate it

SECTION 2 (after the marker): A JSON array of panel configurations for each scene direction. Each panel object should have:
- "panelNumber": sequential number
- "layout": one of "wide", "tall", "closeup", "medium", "establishing", "split", "fullpage", "small" — choose based on the scene mood
- "background": one of "city", "ocean", "desert", "sky", "interior", "street", "forest", "mountain", "factory", "space", "abstract" or null
- "characters": array of { "name": string, "position": "left"|"center"|"right"|"foreground"|"background", "pose": "standing"|"sitting"|"walking"|"running"|"looking"|"pointing"|"turning"|"flying" }
- "bubbles": array of { "type": "speech"|"thought", "text": string } — preserve original Arabic/English
- "directionText": the original direction text this panel represents

Interpret the poetic/natural language carefully. For example:
- "واقفة على جنب" → character standing to the side (position: "right" or "left", pose: "standing")
- "بيتفرج" → character watching/looking (pose: "looking")
- "السحاب ابتدت تجمع" → sky background with clouds
- "From the horizon" → establishing or wide layout
- "A fleet of birds was coming" → sky background, wide or establishing layout

Be creative with the visual interpretation. Every direction segment should produce a panel.

Raw captures (${chunks.length} segments):
${raw}

Remember: organized text FIRST, then ===PANELS=== marker, then JSON array.`;

    const { ok, data } = await think(prompt);
    if (ok && data?.response) {
      const response = data.response;

      // Parse the two sections
      const markerIdx = response.indexOf('===PANELS===');
      let organizedText = response;
      let panelsJson = [];

      if (markerIdx !== -1) {
        organizedText = response.substring(0, markerIdx).trim();
        const jsonPart = response.substring(markerIdx + '===PANELS==='.length).trim();

        // Extract JSON — handle markdown code blocks if AI wraps it
        let cleanJson = jsonPart;
        const codeBlockMatch = jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
          cleanJson = codeBlockMatch[1].trim();
        }

        try {
          panelsJson = JSON.parse(cleanJson);
          if (!Array.isArray(panelsJson)) panelsJson = [];
        } catch (e) {
          console.warn('Could not parse panel JSON from AI:', e);
          panelsJson = [];
        }
      }

      setOrganized(organizedText);
      setAiPanels(panelsJson);

      // Auto-populate panelConfigs from AI suggestions
      // Map AI panels to direction chunk indices
      const directionChunkIndices = chunks
        .map((c, i) => c.type === 'direction' ? i : -1)
        .filter(i => i !== -1);

      const newConfigs = {};
      panelsJson.forEach((panel, i) => {
        // Try to match to direction chunks by index or by text similarity
        const chunkIdx = directionChunkIndices[i] !== undefined
          ? directionChunkIndices[i]
          : i;
        if (chunkIdx !== undefined) {
          newConfigs[chunkIdx] = {
            layout: panel.layout || 'medium',
            background: panel.background || null,
            characters: panel.characters || [],
            bubbles: panel.bubbles || [],
            raw: panel.directionText || chunks[chunkIdx]?.text || '',
          };
        }
      });
      setPanelConfigs(prev => ({ ...prev, ...newConfigs }));

      // Auto-save
      saveIdea(organizedText, 'book_organized').catch(() => {});
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
      // Append storyboard panel layout for direction chunks (user-configured)
      if (panelConfigs[i]) {
        line += '\n' + panelToMarkdown(panelConfigs[i]);
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

  // ── Visual Storyboard Export ──
  // Generates a beautiful HTML storyboard document with SVG panel wireframes
  // and organized text. Opens in new tab for print-to-PDF or downloads as .html
  const exportStoryboard = (openForPrint = false) => {
    // Build panel data array from configured panels (AI-suggested + user-edited)
    const panelsForExport = [];

    if (aiPanels.length > 0) {
      // Use AI panel ordering
      const dirIndices = chunks
        .map((c, i) => c.type === 'direction' ? i : -1)
        .filter(i => i !== -1);

      aiPanels.forEach((aiPanel, i) => {
        const chunkIdx = dirIndices[i] !== undefined ? dirIndices[i] : i;
        // Prefer user-edited config, fall back to AI suggestion
        const config = panelConfigs[chunkIdx] || {
          layout: aiPanel.layout || 'medium',
          background: aiPanel.background || null,
          characters: aiPanel.characters || [],
          bubbles: aiPanel.bubbles || [],
        };
        panelsForExport.push({
          panelData: config,
          directionText: aiPanel.directionText || chunks[chunkIdx]?.text || '',
          panelNumber: aiPanel.panelNumber || i + 1,
        });
      });
    } else {
      // No AI panels — use manually configured panels from direction chunks
      let panelNum = 1;
      chunks.forEach((c, i) => {
        if (c.type === 'direction' && panelConfigs[i]) {
          panelsForExport.push({
            panelData: panelConfigs[i],
            directionText: c.text,
            panelNumber: panelNum++,
          });
        }
      });
    }

    // Generate HTML document
    const title = organized
      ? (organized.match(/#+\s*(.+)/)?.[1] || 'Storyboard')
      : 'A-GENTEE Storyboard';

    const html = generateStoryboardHTML(title, panelsForExport, organized || null);

    if (openForPrint) {
      // Open in new tab for print-to-PDF
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        // Auto-print after a short delay for rendering
        setTimeout(() => win.print(), 600);
      }
    } else {
      // Download as .html file
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agentee-storyboard-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Check if we have any panel data to export as storyboard
  const hasStoryboardPanels = aiPanels.length > 0 ||
    Object.keys(panelConfigs).some(k => {
      const cfg = panelConfigs[k];
      return cfg && (cfg.characters?.length > 0 || cfg.background || cfg.bubbles?.length > 0);
    });

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
                  {/* Interactive panel builder for direction chunks */}
                  {c.type === 'direction' && (
                    <PanelBuilder
                      suggestion={getPanelSuggestion(c.text)}
                      chunkText={c.text}
                      onPanelChange={(data) => updatePanelConfig(i, data)}
                    />
                  )}
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
                      {/* Panel builder for direction chunks (interactive in review too) */}
                      {c.type === 'direction' && (
                        <PanelBuilder
                          suggestion={getPanelSuggestion(c.text)}
                          chunkText={c.text}
                          onPanelChange={(data) => updatePanelConfig(i, data)}
                        />
                      )}
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

                {/* AI-suggested panel storyboard */}
                {aiPanels.length > 0 && (
                  <div className="ws-panels-section">
                    <div className="ws-panels-title">🎬 AI Panel Suggestions — tap to edit</div>
                    <div className="ws-panels-grid">
                      {aiPanels.map((panel, i) => {
                        // Find matching direction chunk index
                        const dirIndices = chunks
                          .map((c, idx) => c.type === 'direction' ? idx : -1)
                          .filter(idx => idx !== -1);
                        const chunkIdx = dirIndices[i] !== undefined ? dirIndices[i] : i;
                        const currentConfig = panelConfigs[chunkIdx] || {
                          layout: panel.layout || 'medium',
                          background: panel.background || null,
                          characters: panel.characters || [],
                          bubbles: panel.bubbles || [],
                          raw: panel.directionText || '',
                        };

                        return (
                          <div key={i} className="ws-panel-card">
                            <div className="ws-panel-card-number">Panel {panel.panelNumber || i + 1}</div>
                            <PanelBuilder
                              suggestion={currentConfig}
                              chunkText={panel.directionText || ''}
                              onPanelChange={(data) => updatePanelConfig(chunkIdx, data)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
                <button onClick={() => { setOrganized(''); setOrgError(''); setAiPanels([]); }}
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
            {/* Storyboard panel preview (if panels exist) */}
            {hasStoryboardPanels && (
              <div className="ws-export-storyboard">
                <div className="ws-export-storyboard-title">🎬 Storyboard Panels</div>
                <div className="ws-export-storyboard-hint">
                  These panels will be included in your storyboard export with full visual wireframes
                </div>
                <div className="ws-export-panels-mini">
                  {(aiPanels.length > 0 ? aiPanels : chunks
                    .map((c, i) => c.type === 'direction' && panelConfigs[i] ? { idx: i, ...panelConfigs[i] } : null)
                    .filter(Boolean)
                  ).map((panel, i) => {
                    const dirIndices = chunks
                      .map((c, idx) => c.type === 'direction' ? idx : -1)
                      .filter(idx => idx !== -1);
                    const chunkIdx = aiPanels.length > 0
                      ? (dirIndices[i] !== undefined ? dirIndices[i] : i)
                      : panel.idx;
                    const config = panelConfigs[chunkIdx] || {
                      layout: panel.layout || 'medium',
                      background: panel.background || null,
                      characters: panel.characters || [],
                      bubbles: panel.bubbles || [],
                    };

                    return (
                      <div key={i} className="ws-export-panel-thumb">
                        <div className="ws-export-panel-num">P{(panel.panelNumber || i + 1)}</div>
                        <PanelBuilder
                          suggestion={config}
                          chunkText={panel.directionText || chunks[chunkIdx]?.text || ''}
                          onPanelChange={(data) => updatePanelConfig(chunkIdx, data)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Text export preview */}
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
              {/* Text exports */}
              <button onClick={() => exportFile('md')} className="ws-export-btn ws-export-md">
                📄 .md
              </button>
              <button onClick={() => exportFile('txt')} className="ws-export-btn ws-export-txt">
                📃 .txt
              </button>
              <button onClick={copyToClipboard} className="ws-export-btn ws-export-copy">
                {copied ? '✅ Copied!' : '📋 Copy'}
              </button>
              {/* Visual storyboard exports */}
              {hasStoryboardPanels && (
                <>
                  <button onClick={() => exportStoryboard(false)} className="ws-export-btn ws-export-storyboard">
                    🎬 Storyboard
                  </button>
                  <button onClick={() => exportStoryboard(true)} className="ws-export-btn ws-export-print">
                    🖨 Print PDF
                  </button>
                </>
              )}
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
