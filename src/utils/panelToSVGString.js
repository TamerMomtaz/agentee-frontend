// src/utils/panelToSVGString.js
// ═══════════════════════════════════════════
// SVG String Generator for Storyboard Export
// Mirrors PanelPreview.jsx but outputs raw SVG markup
// for embedding in HTML storyboard documents.
// ═══════════════════════════════════════════

const COLORS = {
  border: '#4FC3F7',
  bg: 'rgba(5,10,24,0.85)',
  character: '#FFD54F',
  charFill: 'rgba(255,213,79,0.08)',
  bubble: 'rgba(224,232,240,0.92)',
  bubbleText: '#0a1228',
  label: 'rgba(224,232,240,0.35)',
  bgElement: 'rgba(79,195,247,0.12)',
};

// Layout dimensions (width x height)
const LAYOUTS = {
  wide:         { w: 400, h: 160 },
  tall:         { w: 200, h: 320 },
  closeup:      { w: 240, h: 240 },
  medium:       { w: 280, h: 200 },
  establishing: { w: 400, h: 220 },
  split:        { w: 400, h: 180 },
  fullpage:     { w: 320, h: 420 },
  small:        { w: 180, h: 140 },
};

// ─── Background Renderers ───
function bgCity(w, h) {
  const buildings = [];
  for (let i = 0; i < 8; i++) {
    const bw = 20 + (i * 7) % 25;
    const bh = 40 + (i * 31) % 80;
    const x = i * (w / 8) + 5;
    buildings.push(`<rect x="${x}" y="${h - bh - 10}" width="${bw}" height="${bh}" fill="${COLORS.bgElement}" rx="1"/>`);
    // Windows
    for (let wy = h - bh; wy < h - 15; wy += 12) {
      for (let wx = x + 4; wx < x + bw - 4; wx += 8) {
        buildings.push(`<rect x="${wx}" y="${wy}" width="3" height="4" fill="rgba(79,195,247,0.08)"/>`);
      }
    }
  }
  return buildings.join('');
}

function bgOcean(w, h) {
  const waves = [];
  for (let y = h * 0.5; y < h - 10; y += 18) {
    let d = `M 0 ${y}`;
    for (let x = 0; x <= w; x += 30) {
      const amp = 4 + (y % 3) * 2;
      d += ` Q ${x + 15} ${y - amp} ${x + 30} ${y}`;
    }
    waves.push(`<path d="${d}" fill="none" stroke="${COLORS.bgElement}" stroke-width="1.2"/>`);
  }
  return waves.join('');
}

function bgDesert(w, h) {
  return `<path d="M 0 ${h - 30} Q ${w * 0.25} ${h - 65} ${w * 0.5} ${h - 40} Q ${w * 0.75} ${h - 15} ${w} ${h - 50} L ${w} ${h} L 0 ${h} Z" fill="${COLORS.bgElement}"/>`;
}

function bgSky(w, h) {
  const els = [];
  const stars = [[0.15, 0.2], [0.4, 0.15], [0.65, 0.25], [0.85, 0.1], [0.3, 0.4], [0.7, 0.35]];
  stars.forEach(([px, py]) => {
    els.push(`<circle cx="${w * px}" cy="${h * py}" r="1.5" fill="${COLORS.bgElement}"/>`);
  });
  // Cloud
  els.push(`<ellipse cx="${w * 0.6}" cy="${h * 0.3}" rx="25" ry="8" fill="rgba(79,195,247,0.06)"/>`);
  return els.join('');
}

function bgInterior(w, h) {
  return [
    `<line x1="0" y1="${h * 0.7}" x2="${w}" y2="${h * 0.7}" stroke="${COLORS.bgElement}" stroke-width="1"/>`,
    `<line x1="${w * 0.1}" y1="10" x2="${w * 0.1}" y2="${h * 0.7}" stroke="${COLORS.bgElement}" stroke-width="0.8"/>`,
    `<line x1="${w * 0.9}" y1="10" x2="${w * 0.9}" y2="${h * 0.7}" stroke="${COLORS.bgElement}" stroke-width="0.8"/>`,
  ].join('');
}

function bgForest(w, h) {
  const trees = [];
  for (let i = 0; i < 5; i++) {
    const x = w * (0.1 + i * 0.2);
    const th = 30 + (i * 17) % 35;
    trees.push(`<polygon points="${x},${h - th - 10} ${x - 12},${h - 10} ${x + 12},${h - 10}" fill="${COLORS.bgElement}"/>`);
    trees.push(`<line x1="${x}" y1="${h - 10}" x2="${x}" y2="${h - 2}" stroke="${COLORS.bgElement}" stroke-width="2"/>`);
  }
  return trees.join('');
}

function bgMountain(w, h) {
  return `<polygon points="${w * 0.15},${h - 15} ${w * 0.35},${h * 0.25} ${w * 0.55},${h - 15}" fill="${COLORS.bgElement}"/>
    <polygon points="${w * 0.45},${h - 15} ${w * 0.7},${h * 0.15} ${w * 0.9},${h - 15}" fill="rgba(79,195,247,0.08)"/>`;
}

function bgStreet(w, h) {
  return [
    `<line x1="${w * 0.3}" y1="${h - 10}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="${COLORS.bgElement}" stroke-width="1"/>`,
    `<line x1="${w * 0.7}" y1="${h - 10}" x2="${w * 0.5}" y2="${h * 0.35}" stroke="${COLORS.bgElement}" stroke-width="1"/>`,
    // Center dashes
    `<line x1="${w * 0.5}" y1="${h - 15}" x2="${w * 0.5}" y2="${h - 30}" stroke="${COLORS.bgElement}" stroke-width="1" stroke-dasharray="4,4"/>`,
  ].join('');
}

function bgFactory(w, h) {
  return [
    `<rect x="${w * 0.2}" y="${h * 0.4}" width="${w * 0.35}" height="${h * 0.5}" fill="${COLORS.bgElement}" rx="1"/>`,
    `<rect x="${w * 0.6}" y="${h * 0.3}" width="${w * 0.15}" height="${h * 0.6}" fill="${COLORS.bgElement}" rx="1"/>`,
    `<rect x="${w * 0.65}" y="${h * 0.15}" width="${w * 0.05}" height="${h * 0.15}" fill="rgba(79,195,247,0.08)"/>`,
  ].join('');
}

function bgSpace(w, h) {
  const els = [];
  const stars = [[0.1, 0.1], [0.3, 0.2], [0.5, 0.05], [0.7, 0.3], [0.9, 0.15], [0.2, 0.6], [0.6, 0.7], [0.8, 0.5], [0.15, 0.4], [0.45, 0.45]];
  stars.forEach(([px, py]) => {
    const r = 0.8 + Math.random() * 1.2;
    els.push(`<circle cx="${w * px}" cy="${h * py}" r="${r}" fill="rgba(224,232,240,0.15)"/>`);
  });
  // Nebula blob
  els.push(`<ellipse cx="${w * 0.6}" cy="${h * 0.4}" rx="35" ry="20" fill="rgba(206,147,216,0.04)"/>`);
  return els.join('');
}

function bgAbstract(w, h) {
  return [
    `<circle cx="${w * 0.3}" cy="${h * 0.4}" r="30" fill="none" stroke="${COLORS.bgElement}" stroke-dasharray="4,3"/>`,
    `<circle cx="${w * 0.7}" cy="${h * 0.6}" r="20" fill="none" stroke="${COLORS.bgElement}" stroke-dasharray="3,4"/>`,
    `<circle cx="${w * 0.5}" cy="${h * 0.3}" r="15" fill="none" stroke="rgba(79,195,247,0.06)"/>`,
  ].join('');
}

const BG_RENDERERS = {
  city: bgCity, ocean: bgOcean, desert: bgDesert, sky: bgSky,
  interior: bgInterior, forest: bgForest, mountain: bgMountain,
  street: bgStreet, factory: bgFactory, space: bgSpace, abstract: bgAbstract,
};

// ─── Character Silhouette ───
function renderCharacter(char, idx, total, layout, panelW, panelH) {
  // Position calculation
  let cx;
  const posMap = { left: 0.2, center: 0.5, right: 0.8, foreground: 0.5, background: 0.5 };
  if (char.position && posMap[char.position] !== undefined) {
    cx = panelW * posMap[char.position];
  } else {
    // Auto-distribute
    cx = panelW * ((idx + 1) / (total + 1));
  }

  const isBg = char.position === 'background';
  const isCloseup = layout === 'closeup';
  const scale = isCloseup ? 1.6 : isBg ? 0.65 : 1;
  const headR = 7 * scale;
  const bodyH = 28 * scale;
  const baseY = isBg ? panelH * 0.45 : panelH * 0.55;
  const headY = baseY - bodyH - headR;

  let parts = [];

  // Head
  parts.push(`<circle cx="${cx}" cy="${headY}" r="${headR}" fill="${COLORS.charFill}" stroke="${COLORS.character}" stroke-width="1.2"/>`);

  // Body
  parts.push(`<line x1="${cx}" y1="${headY + headR}" x2="${cx}" y2="${baseY}" stroke="${COLORS.character}" stroke-width="1.5"/>`);

  // Arms (pose-dependent)
  const armLen = 14 * scale;
  const armY = headY + headR + bodyH * 0.3;
  const pose = char.pose || 'standing';

  if (pose === 'pointing') {
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen}" y2="${armY + 4}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen + 6}" y2="${armY - 8}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else if (pose === 'looking' || pose === 'turning') {
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen}" y2="${armY + 6}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen}" y2="${armY + 6}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else if (pose === 'sitting') {
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen * 0.8}" y2="${armY + 8}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen * 0.8}" y2="${armY + 8}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else if (pose === 'flying') {
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen - 4}" y2="${armY - 10}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen + 4}" y2="${armY - 10}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else if (pose === 'running' || pose === 'walking') {
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen}" y2="${armY - 5}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen}" y2="${armY + 5}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else {
    // Standing default
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx - armLen}" y2="${armY + armLen * 0.7}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${armY}" x2="${cx + armLen}" y2="${armY + armLen * 0.7}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  }

  // Legs
  const legLen = 16 * scale;
  if (pose === 'sitting') {
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx - 8 * scale}" y2="${baseY + legLen * 0.6}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx + 8 * scale}" y2="${baseY + legLen * 0.6}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else if (pose === 'running' || pose === 'walking') {
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx - 10 * scale}" y2="${baseY + legLen}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx + 10 * scale}" y2="${baseY + legLen}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  } else {
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx - 6 * scale}" y2="${baseY + legLen}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
    parts.push(`<line x1="${cx}" y1="${baseY}" x2="${cx + 6 * scale}" y2="${baseY + legLen}" stroke="${COLORS.character}" stroke-width="1.2"/>`);
  }

  // Name label
  parts.push(`<text x="${cx}" y="${baseY + legLen + 12 * scale}" text-anchor="middle" fill="${COLORS.character}" font-size="${8 * scale}" font-family="Fira Mono, monospace" opacity="0.7">${escapeXml(char.name)}</text>`);

  return parts.join('');
}

// ─── Speech/Thought Bubbles ───
function renderBubble(bubble, idx, panelW, panelH) {
  const bw = Math.min(panelW * 0.45, 140);
  const bh = 28;

  // Position: try to put near top, alternate sides
  let bx = idx % 2 === 0 ? panelW * 0.05 : panelW - bw - panelW * 0.05;
  let by = 15 + idx * 35;
  if (by + bh > panelH * 0.5) by = panelH * 0.5 - bh;

  const isThought = bubble.type === 'thought';
  const text = bubble.text || '';
  // Truncate for display
  const displayText = text.length > 30 ? text.substring(0, 28) + '…' : text;
  // Detect RTL
  const isRTL = /[\u0600-\u06FF]/.test(text);

  let parts = [];

  // Bubble shape
  if (isThought) {
    parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="14" fill="${COLORS.bubble}" stroke="${COLORS.border}" stroke-width="0.8" stroke-dasharray="3,2"/>`);
    // Thought dots
    parts.push(`<circle cx="${bx + bw * 0.3}" cy="${by + bh + 6}" r="3" fill="${COLORS.bubble}" opacity="0.6"/>`);
    parts.push(`<circle cx="${bx + bw * 0.25}" cy="${by + bh + 12}" r="2" fill="${COLORS.bubble}" opacity="0.4"/>`);
  } else {
    parts.push(`<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="6" fill="${COLORS.bubble}" stroke="${COLORS.border}" stroke-width="0.6"/>`);
    // Tail pointer
    const tailX = bx + bw * 0.3;
    parts.push(`<polygon points="${tailX},${by + bh} ${tailX + 5},${by + bh + 8} ${tailX + 10},${by + bh}" fill="${COLORS.bubble}"/>`);
  }

  // Text
  const textAnchor = isRTL ? 'end' : 'start';
  const textX = isRTL ? bx + bw - 8 : bx + 8;
  parts.push(`<text x="${textX}" y="${by + bh / 2 + 4}" text-anchor="${textAnchor}" fill="${COLORS.bubbleText}" font-size="9" font-family="sans-serif" direction="${isRTL ? 'rtl' : 'ltr'}">${escapeXml(displayText)}</text>`);

  return parts.join('');
}

// ─── Utility ───
function escapeXml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ═══════════════════════════════════════════
// MAIN EXPORT: Generate full SVG string
// ═══════════════════════════════════════════
export function panelToSVGString(panel) {
  if (!panel) return '';

  const layoutKey = panel.layout || 'medium';
  const dims = LAYOUTS[layoutKey] || LAYOUTS.medium;
  const { w, h } = dims;

  let svg = [];

  // Panel background
  svg.push(`<rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="6" fill="${COLORS.bg}" stroke="${COLORS.border}" stroke-width="1.5"/>`);

  // Background scene
  if (panel.background && BG_RENDERERS[panel.background]) {
    svg.push(BG_RENDERERS[panel.background](w, h));
  }

  // Characters
  if (panel.characters && panel.characters.length > 0) {
    panel.characters.forEach((char, i) => {
      svg.push(renderCharacter(char, i, panel.characters.length, layoutKey, w, h));
    });
  }

  // Bubbles
  if (panel.bubbles && panel.bubbles.length > 0) {
    panel.bubbles.forEach((bubble, i) => {
      svg.push(renderBubble(bubble, i, w, h));
    });
  }

  // Layout label (top-right corner)
  svg.push(`<text x="${w - 8}" y="14" text-anchor="end" fill="${COLORS.label}" font-size="7" font-family="Fira Mono, monospace">${layoutKey.toUpperCase()}</text>`);

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${svg.join('')}</svg>`;
}

// ═══════════════════════════════════════════
// STORYBOARD HTML DOCUMENT GENERATOR
// Builds a complete, styled, print-ready HTML
// document with all panels + text in sequence.
// ═══════════════════════════════════════════
export function generateStoryboardHTML(title, panels, organizedText) {
  // panels = array of { panelData, directionText, panelNumber }

  const panelCards = panels.map((p, i) => {
    const svgStr = panelToSVGString(p.panelData);
    const dirText = escapeXml(p.directionText || '');
    const isRTL = /[\u0600-\u06FF]/.test(p.directionText || '');

    return `
      <div class="panel-card">
        <div class="panel-number">Panel ${p.panelNumber || i + 1}</div>
        <div class="panel-svg">${svgStr}</div>
        <div class="panel-text" ${isRTL ? 'dir="rtl"' : ''}>${dirText}</div>
        ${p.panelData?.characters?.length ? `<div class="panel-meta">Characters: ${p.panelData.characters.map(c => c.name).join(', ')}</div>` : ''}
      </div>`;
  }).join('');

  // If there's organized text beyond panels, include it
  const organizedSection = organizedText ? `
    <div class="organized-section">
      <h2>Full Organized Draft</h2>
      <div class="organized-text">${escapeXml(organizedText).replace(/\n/g, '<br/>')}</div>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${escapeXml(title || 'A-GENTEE Storyboard')}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fira+Mono:wght@400;500;700&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #0a1228;
    color: #e0e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 30px;
  }

  .storyboard-header {
    text-align: center;
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid rgba(79,195,247,0.2);
  }

  .storyboard-header h1 {
    font-family: 'Fira Mono', monospace;
    color: #FFD54F;
    font-size: 1.6rem;
    margin-bottom: 6px;
  }

  .storyboard-header .subtitle {
    color: rgba(224,232,240,0.4);
    font-size: 0.85rem;
  }

  .storyboard-header .branding {
    font-family: 'Fira Mono', monospace;
    color: #4FC3F7;
    font-size: 0.75rem;
    margin-top: 6px;
    opacity: 0.6;
  }

  .panels-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 24px;
    margin-bottom: 40px;
  }

  .panel-card {
    background: rgba(15,25,50,0.8);
    border: 1px solid rgba(79,195,247,0.15);
    border-radius: 10px;
    padding: 16px;
    page-break-inside: avoid;
  }

  .panel-number {
    font-family: 'Fira Mono', monospace;
    color: #4FC3F7;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 10px;
  }

  .panel-svg {
    margin-bottom: 12px;
    text-align: center;
  }

  .panel-svg svg {
    max-width: 100%;
    height: auto;
    border-radius: 4px;
    filter: drop-shadow(0 2px 8px rgba(0,0,0,0.3));
  }

  .panel-text {
    color: rgba(224,232,240,0.8);
    font-size: 0.9rem;
    line-height: 1.5;
    padding: 8px 0;
    border-top: 1px solid rgba(224,232,240,0.06);
  }

  .panel-meta {
    font-family: 'Fira Mono', monospace;
    font-size: 0.7rem;
    color: rgba(255,213,79,0.5);
    margin-top: 6px;
  }

  .organized-section {
    margin-top: 40px;
    padding-top: 30px;
    border-top: 2px solid rgba(79,195,247,0.15);
  }

  .organized-section h2 {
    font-family: 'Fira Mono', monospace;
    color: #FFD54F;
    font-size: 1.1rem;
    margin-bottom: 16px;
  }

  .organized-text {
    color: rgba(224,232,240,0.7);
    font-size: 0.88rem;
    line-height: 1.7;
    max-width: 700px;
  }

  /* ─── PRINT STYLES ─── */
  @media print {
    body { background: white; color: #1a1a1a; padding: 15px; }
    .storyboard-header h1 { color: #333; }
    .storyboard-header .subtitle, .storyboard-header .branding { color: #777; }
    .panel-card {
      background: #f8f8f8;
      border: 1px solid #ddd;
      break-inside: avoid;
    }
    .panel-number { color: #2196F3; }
    .panel-text { color: #333; border-top-color: #ddd; }
    .panel-meta { color: #888; }
    .organized-section { border-top-color: #ddd; }
    .organized-section h2 { color: #333; }
    .organized-text { color: #444; }
    .panels-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
  }
</style>
</head>
<body>
  <div class="storyboard-header">
    <h1>🎬 ${escapeXml(title || 'Storyboard')}</h1>
    <div class="subtitle">${panels.length} panel${panels.length !== 1 ? 's' : ''} • Generated ${new Date().toLocaleDateString()}</div>
    <div class="branding">A-GENTEE Book Mode • &I</div>
  </div>

  <div class="panels-grid">
    ${panelCards}
  </div>

  ${organizedSection}

  <script>
    // Auto-print hint
    if (window.location.search.includes('print=1')) {
      window.print();
    }
  </script>
</body>
</html>`;
}
