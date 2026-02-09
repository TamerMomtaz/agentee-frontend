// src/components/PanelBuilder.jsx
// Interactive panel configurator — the &I approach:
// Machine suggests, Human decides. Tappable chips for layout, background,
// characters, bubbles. Live wireframe preview updates with every selection.

import { useState, useEffect } from 'react';
import PanelPreview from './PanelPreview.jsx';

// ─── Option Sets ───
const LAYOUTS = [
  { key: 'wide', label: '↔ Wide', icon: '↔' },
  { key: 'tall', label: '↕ Tall', icon: '↕' },
  { key: 'closeup', label: '🔍 Close-up', icon: '🔍' },
  { key: 'medium', label: '▢ Medium', icon: '▢' },
  { key: 'establishing', label: '🌄 Establishing', icon: '🌄' },
  { key: 'split', label: '⧉ Split', icon: '⧉' },
  { key: 'fullpage', label: '📄 Full Page', icon: '📄' },
  { key: 'small', label: '◻ Small', icon: '◻' },
];

const BACKGROUNDS = [
  { key: 'city', label: '🏙 City' },
  { key: 'ocean', label: '🌊 Ocean' },
  { key: 'desert', label: '🏜 Desert' },
  { key: 'sky', label: '☁ Sky' },
  { key: 'interior', label: '🏠 Interior' },
  { key: 'street', label: '🛣 Street' },
  { key: 'forest', label: '🌲 Forest' },
  { key: 'mountain', label: '⛰ Mountain' },
  { key: 'factory', label: '🏭 Factory' },
  { key: 'space', label: '🌌 Space' },
  { key: 'abstract', label: '🎨 Abstract' },
];

const POSITIONS = [
  { key: 'left', label: '← Left' },
  { key: 'center', label: '◉ Center' },
  { key: 'right', label: '→ Right' },
  { key: 'foreground', label: '▲ Front' },
  { key: 'background', label: '▽ Back' },
];

const POSES = [
  { key: 'standing', label: '🧍 Standing' },
  { key: 'sitting', label: '🪑 Sitting' },
  { key: 'walking', label: '🚶 Walking' },
  { key: 'running', label: '🏃 Running' },
  { key: 'looking', label: '👁 Looking' },
  { key: 'pointing', label: '👉 Pointing' },
  { key: 'turning', label: '↩ Turning' },
  { key: 'flying', label: '🕊 Flying' },
];

const KNOWN_NAMES = ['Kahotia', 'Tee'];

export default function PanelBuilder({ suggestion, onPanelChange, chunkText }) {
  // Initialize from parser suggestion (if any), or defaults
  const [layout, setLayout] = useState(suggestion?.layout || 'medium');
  const [background, setBackground] = useState(suggestion?.background || null);
  const [characters, setCharacters] = useState(suggestion?.characters || []);
  const [bubbles, setBubbles] = useState(suggestion?.bubbles || []);
  const [collapsed, setCollapsed] = useState(false);
  const [showAddChar, setShowAddChar] = useState(false);
  const [showAddBubble, setShowAddBubble] = useState(false);

  // New character form state
  const [newCharName, setNewCharName] = useState('');
  const [newCharPos, setNewCharPos] = useState('center');
  const [newCharPose, setNewCharPose] = useState('standing');

  // New bubble form state
  const [newBubbleText, setNewBubbleText] = useState('');
  const [newBubbleType, setNewBubbleType] = useState('speech');

  // Build the live panel data object
  const panelData = {
    layout,
    background,
    characters,
    bubbles: bubbles.map((b, i) => ({
      ...b,
      position: characters.length > 0
        ? (characters[Math.min(i, characters.length - 1)]?.position === 'left' ? 'top-left' : 'top-right')
        : 'top-center',
    })),
    raw: chunkText || '',
  };

  // Notify parent whenever panel changes
  useEffect(() => {
    if (onPanelChange) onPanelChange(panelData);
  }, [layout, background, characters, bubbles]);

  // ─── Character Management ───
  const addCharacter = () => {
    if (!newCharName.trim()) return;
    setCharacters(prev => [...prev, {
      name: newCharName.trim(),
      position: newCharPos,
      pose: newCharPose,
    }]);
    setNewCharName('');
    setNewCharPos('center');
    setNewCharPose('standing');
    setShowAddChar(false);
  };

  const removeCharacter = (idx) => {
    setCharacters(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Bubble Management ───
  const addBubble = () => {
    if (!newBubbleText.trim()) return;
    setBubbles(prev => [...prev, {
      type: newBubbleType,
      text: newBubbleText.trim(),
      position: 'auto',
    }]);
    setNewBubbleText('');
    setNewBubbleType('speech');
    setShowAddBubble(false);
  };

  const removeBubble = (idx) => {
    setBubbles(prev => prev.filter((_, i) => i !== idx));
  };

  // ─── Highlight which options were suggested by parser ───
  const isSuggested = (type, key) => {
    if (!suggestion) return false;
    if (type === 'layout') return suggestion.layout === key;
    if (type === 'bg') return suggestion.background === key;
    return false;
  };

  if (collapsed) {
    // Collapsed mini-view: just show what's configured + expand button
    const summary = [
      layout.toUpperCase(),
      background ? `BG:${background}` : null,
      characters.length > 0 ? `${characters.length} char` : null,
      bubbles.length > 0 ? `${bubbles.length} bubble` : null,
    ].filter(Boolean).join(' • ');

    return (
      <div className="pb-collapsed" onClick={() => setCollapsed(false)}>
        <span className="pb-collapsed-icon">🎬</span>
        <span className="pb-collapsed-summary">{summary}</span>
        <span className="pb-collapsed-expand">▼ Edit Panel</span>
      </div>
    );
  }

  return (
    <div className="pb-container">
      {/* Header with collapse toggle */}
      <div className="pb-header">
        <span className="pb-header-title">🎬 Panel Builder</span>
        <span className="pb-header-hint">tap to select • parser suggestions highlighted</span>
        <button className="pb-collapse-btn" onClick={() => setCollapsed(true)}>▲ Collapse</button>
      </div>

      {/* ═══ LAYOUT CHIPS ═══ */}
      <div className="pb-section">
        <div className="pb-section-label">Layout</div>
        <div className="pb-chips">
          {LAYOUTS.map(l => (
            <button
              key={l.key}
              className={`pb-chip${layout === l.key ? ' selected' : ''}${isSuggested('layout', l.key) ? ' suggested' : ''}`}
              onClick={() => setLayout(l.key)}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ BACKGROUND CHIPS ═══ */}
      <div className="pb-section">
        <div className="pb-section-label">Background</div>
        <div className="pb-chips">
          <button
            className={`pb-chip${background === null ? ' selected' : ''}`}
            onClick={() => setBackground(null)}
          >✕ None</button>
          {BACKGROUNDS.map(b => (
            <button
              key={b.key}
              className={`pb-chip${background === b.key ? ' selected' : ''}${isSuggested('bg', b.key) ? ' suggested' : ''}`}
              onClick={() => setBackground(b.key)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {/* ═══ CHARACTERS ═══ */}
      <div className="pb-section">
        <div className="pb-section-label">Characters ({characters.length})</div>

        {/* Existing characters */}
        {characters.map((c, i) => (
          <div key={i} className="pb-char-item">
            <span className="pb-char-name">{c.name}</span>
            <span className="pb-char-detail">{c.position} • {c.pose}</span>
            <button className="pb-char-remove" onClick={() => removeCharacter(i)}>✕</button>
          </div>
        ))}

        {/* Add character form */}
        {showAddChar ? (
          <div className="pb-add-form">
            {/* Name input with quick-pick buttons */}
            <div className="pb-form-row">
              <input
                className="pb-input"
                value={newCharName}
                onChange={(e) => setNewCharName(e.target.value)}
                placeholder="Character name..."
                autoFocus
              />
              {KNOWN_NAMES.map(n => (
                <button key={n} className="pb-quick-name" onClick={() => setNewCharName(n)}>
                  {n}
                </button>
              ))}
            </div>

            {/* Position chips */}
            <div className="pb-form-row">
              <span className="pb-form-label">Position:</span>
              {POSITIONS.map(p => (
                <button key={p.key}
                  className={`pb-chip pb-chip-sm${newCharPos === p.key ? ' selected' : ''}`}
                  onClick={() => setNewCharPos(p.key)}
                >{p.label}</button>
              ))}
            </div>

            {/* Pose chips */}
            <div className="pb-form-row">
              <span className="pb-form-label">Pose:</span>
              {POSES.map(p => (
                <button key={p.key}
                  className={`pb-chip pb-chip-sm${newCharPose === p.key ? ' selected' : ''}`}
                  onClick={() => setNewCharPose(p.key)}
                >{p.label}</button>
              ))}
            </div>

            {/* Confirm / Cancel */}
            <div className="pb-form-actions">
              <button className="pb-form-confirm" onClick={addCharacter}
                disabled={!newCharName.trim()}>✓ Add</button>
              <button className="pb-form-cancel" onClick={() => setShowAddChar(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="pb-add-btn" onClick={() => setShowAddChar(true)}>
            + Add Character
          </button>
        )}
      </div>

      {/* ═══ BUBBLES ═══ */}
      <div className="pb-section">
        <div className="pb-section-label">Speech / Thought ({bubbles.length})</div>

        {/* Existing bubbles */}
        {bubbles.map((b, i) => (
          <div key={i} className="pb-bubble-item">
            <span className="pb-bubble-type">{b.type === 'thought' ? '💭' : '💬'}</span>
            <span className="pb-bubble-text">{b.text}</span>
            <button className="pb-char-remove" onClick={() => removeBubble(i)}>✕</button>
          </div>
        ))}

        {/* Add bubble form */}
        {showAddBubble ? (
          <div className="pb-add-form">
            <div className="pb-form-row">
              <button className={`pb-chip pb-chip-sm${newBubbleType === 'speech' ? ' selected' : ''}`}
                onClick={() => setNewBubbleType('speech')}>💬 Speech</button>
              <button className={`pb-chip pb-chip-sm${newBubbleType === 'thought' ? ' selected' : ''}`}
                onClick={() => setNewBubbleType('thought')}>💭 Thought</button>
            </div>
            <input
              className="pb-input"
              value={newBubbleText}
              onChange={(e) => setNewBubbleText(e.target.value)}
              placeholder="Bubble text... (Arabic or English)"
              dir="auto"
              autoFocus
            />
            <div className="pb-form-actions">
              <button className="pb-form-confirm" onClick={addBubble}
                disabled={!newBubbleText.trim()}>✓ Add</button>
              <button className="pb-form-cancel" onClick={() => setShowAddBubble(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="pb-add-btn" onClick={() => setShowAddBubble(true)}>
            + Add Bubble
          </button>
        )}
      </div>

      {/* ═══ LIVE PREVIEW ═══ */}
      {(characters.length > 0 || bubbles.length > 0 || background) && (
        <div className="pb-section">
          <div className="pb-section-label">Preview</div>
          <PanelPreview panel={panelData} />
        </div>
      )}
    </div>
  );
}
