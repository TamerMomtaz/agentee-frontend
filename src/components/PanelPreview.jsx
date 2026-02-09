// src/components/PanelPreview.jsx
// Renders wireframe comic panel from parsed direction data
// Style: sketch-like wireframes with the A-GENTEE color palette

const COLORS = {
  border: '#4FC3F7',
  borderDim: 'rgba(79,195,247,0.3)',
  character: '#FFD54F',
  characterDim: 'rgba(255,213,79,0.15)',
  bubble: 'rgba(224,232,240,0.9)',
  bubbleBorder: 'rgba(79,195,247,0.5)',
  thoughtBorder: 'rgba(206,147,216,0.5)',
  bg: 'rgba(5,10,24,0.6)',
  bgElement: 'rgba(79,195,247,0.12)',
  bgStroke: 'rgba(79,195,247,0.18)',
  label: 'rgba(224,232,240,0.35)',
  ground: 'rgba(79,195,247,0.08)',
};

// ─── Layout Dimensions ───
function getLayoutDims(layout) {
  switch (layout) {
    case 'wide':        return { w: 320, h: 140 };
    case 'tall':        return { w: 180, h: 280 };
    case 'closeup':     return { w: 220, h: 220 };
    case 'establishing': return { w: 320, h: 160 };
    case 'split':       return { w: 320, h: 160 };
    case 'fullpage':    return { w: 280, h: 320 };
    case 'small':       return { w: 160, h: 140 };
    default:            return { w: 260, h: 180 }; // medium
  }
}

// ─── Background Renderers ───
function renderBackground(bg, w, h) {
  const elements = [];
  const cy = h; // bottom

  switch (bg) {
    case 'city':
      // Skyline silhouette
      [0.15, 0.3, 0.22, 0.45, 0.35, 0.5, 0.28, 0.65, 0.4, 0.8].forEach((xf, i) => {
        const bw = 12 + Math.random() * 16;
        const bh = 25 + (i % 3) * 20 + Math.random() * 30;
        elements.push(
          <rect key={`bld-${i}`} x={xf * w - bw / 2} y={cy - bh - 4}
            width={bw} height={bh} fill={COLORS.bgElement}
            stroke={COLORS.bgStroke} strokeWidth="0.5" rx="1" />
        );
        // Windows
        for (let wy = cy - bh + 5; wy < cy - 8; wy += 8) {
          elements.push(
            <rect key={`win-${i}-${wy}`} x={xf * w - bw / 2 + 3} y={wy}
              width={bw - 6} height={3} fill="rgba(255,213,79,0.06)" rx="0.5" />
          );
        }
      });
      break;

    case 'ocean':
      // Horizontal wave lines
      for (let i = 0; i < 4; i++) {
        const y = cy - 10 - i * 14;
        const amp = 4 + i * 1.5;
        let d = `M 0 ${y}`;
        for (let x = 0; x <= w; x += 8) {
          d += ` Q ${x + 4} ${y + (x % 16 < 8 ? -amp : amp)} ${x + 8} ${y}`;
        }
        elements.push(
          <path key={`wave-${i}`} d={d} fill="none"
            stroke={COLORS.bgStroke} strokeWidth={1.2 - i * 0.2}
            opacity={0.6 - i * 0.12} />
        );
      }
      break;

    case 'desert':
      // Dune curves
      elements.push(
        <path key="dune1" d={`M 0 ${cy - 5} Q ${w * 0.25} ${cy - 35} ${w * 0.5} ${cy - 15} Q ${w * 0.75} ${cy + 5} ${w} ${cy - 10}`}
          fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.7" />
      );
      elements.push(
        <path key="dune2" d={`M 0 ${cy - 2} Q ${w * 0.4} ${cy - 20} ${w * 0.7} ${cy - 8} L ${w} ${cy}`}
          fill="rgba(79,195,247,0.06)" stroke={COLORS.bgStroke} strokeWidth="0.5" />
      );
      break;

    case 'interior':
      // Simple room: floor line + wall corners
      elements.push(
        <line key="floor" x1="0" y1={cy - 4} x2={w} y2={cy - 4}
          stroke={COLORS.bgStroke} strokeWidth="1" />
      );
      elements.push(
        <line key="wall-l" x1={4} y1={8} x2={4} y2={cy - 4}
          stroke={COLORS.bgStroke} strokeWidth="0.5" strokeDasharray="4,4" />
      );
      elements.push(
        <line key="wall-r" x1={w - 4} y1={8} x2={w - 4} y2={cy - 4}
          stroke={COLORS.bgStroke} strokeWidth="0.5" strokeDasharray="4,4" />
      );
      break;

    case 'sky':
      // Scattered small circles (stars/clouds)
      for (let i = 0; i < 8; i++) {
        const sx = 15 + Math.random() * (w - 30);
        const sy = 10 + Math.random() * (h * 0.5);
        const sr = 1 + Math.random() * 2;
        elements.push(
          <circle key={`star-${i}`} cx={sx} cy={sy} r={sr}
            fill="rgba(255,213,79,0.15)" />
        );
      }
      break;

    case 'forest':
      // Simple tree shapes
      for (let i = 0; i < 5; i++) {
        const tx = 10 + i * (w / 5) + Math.random() * 20;
        const th = 20 + Math.random() * 25;
        elements.push(
          <polygon key={`tree-${i}`}
            points={`${tx},${cy - 4 - th} ${tx - 8},${cy - 4} ${tx + 8},${cy - 4}`}
            fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.5" />
        );
      }
      break;

    case 'mountain':
      elements.push(
        <polygon key="mt1" points={`${w * 0.1},${cy - 4} ${w * 0.3},${cy - 55} ${w * 0.5},${cy - 4}`}
          fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.7" />
      );
      elements.push(
        <polygon key="mt2" points={`${w * 0.4},${cy - 4} ${w * 0.65},${cy - 70} ${w * 0.9},${cy - 4}`}
          fill="rgba(79,195,247,0.08)" stroke={COLORS.bgStroke} strokeWidth="0.7" />
      );
      break;

    case 'street':
      // Perspective lines
      elements.push(
        <line key="st-l" x1={0} y1={cy - 4} x2={w * 0.5} y2={h * 0.35}
          stroke={COLORS.bgStroke} strokeWidth="0.7" />
      );
      elements.push(
        <line key="st-r" x1={w} y1={cy - 4} x2={w * 0.5} y2={h * 0.35}
          stroke={COLORS.bgStroke} strokeWidth="0.7" />
      );
      // Center line dashes
      for (let i = 0; i < 5; i++) {
        const t = 0.2 + i * 0.15;
        const cx = w * 0.5;
        const cyy = h * 0.35 + (cy - 4 - h * 0.35) * t;
        elements.push(
          <line key={`dash-${i}`} x1={cx} y1={cyy} x2={cx} y2={cyy + 4 + i * 2}
            stroke="rgba(255,213,79,0.1)" strokeWidth={1 + i * 0.3} />
        );
      }
      break;

    case 'factory':
      // Industrial shapes
      elements.push(
        <rect key="f1" x={w * 0.1} y={cy - 45} width={30} height={41}
          fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.5" />
      );
      elements.push(
        <rect key="f2" x={w * 0.6} y={cy - 55} width={25} height={51}
          fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.5" />
      );
      // Chimney
      elements.push(
        <rect key="chimney" x={w * 0.62} y={cy - 70} width={6} height={18}
          fill={COLORS.bgElement} stroke={COLORS.bgStroke} strokeWidth="0.5" />
      );
      break;

    case 'space':
      // Stars and nebula hint
      for (let i = 0; i < 15; i++) {
        const sx = Math.random() * w;
        const sy = Math.random() * h;
        const sr = 0.5 + Math.random() * 2;
        elements.push(
          <circle key={`sp-${i}`} cx={sx} cy={sy} r={sr}
            fill={i % 3 === 0 ? 'rgba(255,213,79,0.2)' : 'rgba(79,195,247,0.15)'} />
        );
      }
      // Nebula blob
      elements.push(
        <ellipse key="nebula" cx={w * 0.7} cy={h * 0.3} rx={30} ry={18}
          fill="rgba(206,147,216,0.06)" stroke="rgba(206,147,216,0.08)" strokeWidth="0.5" />
      );
      break;

    case 'abstract':
      // Geometric shapes
      for (let i = 0; i < 6; i++) {
        const ax = Math.random() * w;
        const ay = Math.random() * h;
        elements.push(
          <circle key={`abs-${i}`} cx={ax} cy={ay} r={8 + Math.random() * 20}
            fill="none" stroke={COLORS.bgStroke} strokeWidth="0.5"
            strokeDasharray={`${2 + i},${3 + i}`} />
        );
      }
      break;

    default:
      // Ground line only
      elements.push(
        <line key="ground" x1="0" y1={cy - 4} x2={w} y2={cy - 4}
          stroke={COLORS.bgStroke} strokeWidth="0.5" />
      );
  }

  return elements;
}

// ─── Character Silhouette ───
function renderCharacter(char, idx, totalChars, panelW, panelH, isCloseup) {
  // Calculate x position
  let cx;
  switch (char.position) {
    case 'left':       cx = panelW * 0.22; break;
    case 'right':      cx = panelW * 0.78; break;
    case 'center':     cx = panelW * 0.5; break;
    case 'foreground': cx = panelW * (0.3 + idx * 0.2); break;
    case 'background': cx = panelW * (0.3 + idx * 0.2); break;
    default:
      // Auto-distribute
      cx = panelW * ((idx + 1) / (totalChars + 1));
  }

  const isBg = char.position === 'background';
  const scale = isCloseup ? 1.6 : (isBg ? 0.6 : 1);
  const baseH = panelH * 0.45 * scale;
  const headR = Math.max(5, baseH * 0.18);
  const bodyH = baseH - headR * 2;
  const shoulderW = headR * 1.6;

  // Y position: feet at bottom, adjusted for bg characters
  const footY = panelH - 8 - (isBg ? panelH * 0.15 : 0);
  const headCY = footY - bodyH - headR;
  const neckY = headCY + headR;

  const charColor = COLORS.character;
  const charDim = isBg ? 'rgba(255,213,79,0.2)' : COLORS.characterDim;

  const elements = [];

  // Head
  elements.push(
    <circle key={`head-${idx}`} cx={cx} cy={headCY} r={headR}
      fill={charDim} stroke={charColor} strokeWidth="1.2" />
  );

  // Body line
  elements.push(
    <line key={`body-${idx}`} x1={cx} y1={neckY} x2={cx} y2={footY - bodyH * 0.4}
      stroke={charColor} strokeWidth="1.5" strokeLinecap="round" />
  );

  // Determine arm positions based on pose
  const midBodyY = neckY + bodyH * 0.2;
  let leftArmEnd, rightArmEnd;

  switch (char.pose) {
    case 'pointing':
      leftArmEnd = { x: cx - shoulderW, y: midBodyY + 8 };
      rightArmEnd = { x: cx + shoulderW * 1.5, y: midBodyY - 5 };
      break;
    case 'flying':
      leftArmEnd = { x: cx - shoulderW * 1.3, y: midBodyY - 10 };
      rightArmEnd = { x: cx + shoulderW * 1.3, y: midBodyY - 10 };
      break;
    default:
      leftArmEnd = { x: cx - shoulderW, y: midBodyY + 10 };
      rightArmEnd = { x: cx + shoulderW, y: midBodyY + 10 };
  }

  // Arms
  elements.push(
    <line key={`arm-l-${idx}`} x1={cx} y1={midBodyY} x2={leftArmEnd.x} y2={leftArmEnd.y}
      stroke={charColor} strokeWidth="1.2" strokeLinecap="round" />
  );
  elements.push(
    <line key={`arm-r-${idx}`} x1={cx} y1={midBodyY} x2={rightArmEnd.x} y2={rightArmEnd.y}
      stroke={charColor} strokeWidth="1.2" strokeLinecap="round" />
  );

  // Legs
  const hipY = footY - bodyH * 0.4;
  const legSpread = char.pose === 'walking' || char.pose === 'running' ? shoulderW * 0.8 : shoulderW * 0.4;
  elements.push(
    <line key={`leg-l-${idx}`} x1={cx} y1={hipY} x2={cx - legSpread} y2={footY}
      stroke={charColor} strokeWidth="1.2" strokeLinecap="round" />
  );
  elements.push(
    <line key={`leg-r-${idx}`} x1={cx} y1={hipY} x2={cx + legSpread} y2={footY}
      stroke={charColor} strokeWidth="1.2" strokeLinecap="round" />
  );

  // Character name label
  elements.push(
    <text key={`name-${idx}`} x={cx} y={headCY - headR - 5}
      textAnchor="middle" fontSize="8" fontFamily="'IBM Plex Mono',monospace"
      fill={charColor} opacity="0.7">
      {char.name}
    </text>
  );

  return elements;
}

// ─── Speech Bubble ───
function renderBubble(bubble, idx, panelW, panelH) {
  const isThought = bubble.type === 'thought';
  const maxTextW = Math.min(panelW * 0.45, 130);
  const text = bubble.text.length > 40 ? bubble.text.substring(0, 37) + '...' : bubble.text;
  const isRTL = /[\u0600-\u06FF]/.test(text);

  // Position
  let bx, by;
  switch (bubble.position) {
    case 'top-left':    bx = panelW * 0.25; by = 22 + idx * 30; break;
    case 'top-right':   bx = panelW * 0.75; by = 22 + idx * 30; break;
    case 'top-center':  bx = panelW * 0.5; by = 22 + idx * 30; break;
    default:            bx = panelW * (0.3 + idx * 0.25); by = 22 + idx * 30;
  }

  // Estimate text height (rough: ~12px per line, ~10 chars per line for this font size)
  const charsPerLine = Math.floor(maxTextW / 6);
  const lines = Math.ceil(text.length / charsPerLine);
  const textH = Math.max(16, lines * 13 + 8);
  const bubbleW = Math.min(maxTextW, text.length * 6.5 + 16);
  const bubbleH = textH + 4;

  const borderColor = isThought ? COLORS.thoughtBorder : COLORS.bubbleBorder;
  const elements = [];

  // Bubble shape
  elements.push(
    <rect key={`bb-${idx}`}
      x={bx - bubbleW / 2} y={by - bubbleH / 2}
      width={bubbleW} height={bubbleH}
      rx={isThought ? bubbleH / 2 : 8}
      fill="rgba(10,22,40,0.85)"
      stroke={borderColor} strokeWidth="1"
      strokeDasharray={isThought ? '3,2' : 'none'}
    />
  );

  // Tail (pointer down)
  if (!isThought) {
    const tailX = bx;
    const tailY = by + bubbleH / 2;
    elements.push(
      <polygon key={`tail-${idx}`}
        points={`${tailX - 4},${tailY} ${tailX + 4},${tailY} ${tailX},${tailY + 8}`}
        fill="rgba(10,22,40,0.85)" stroke={borderColor} strokeWidth="1"
      />
    );
    // Cover the border where tail meets bubble
    elements.push(
      <line key={`tail-cover-${idx}`}
        x1={tailX - 4} y1={tailY} x2={tailX + 4} y2={tailY}
        stroke="rgba(10,22,40,0.85)" strokeWidth="2"
      />
    );
  } else {
    // Thought bubble dots
    const dotX = bx;
    const dotY = by + bubbleH / 2 + 4;
    [3, 2, 1.5].forEach((r, i) => {
      elements.push(
        <circle key={`tdot-${idx}-${i}`}
          cx={dotX + i * 5} cy={dotY + i * 6} r={r}
          fill="none" stroke={borderColor} strokeWidth="0.8" />
      );
    });
  }

  // Text
  elements.push(
    <text key={`btxt-${idx}`}
      x={bx} y={by + 1}
      textAnchor="middle" dominantBaseline="middle"
      fontSize="8" fontFamily="'IBM Plex Sans',sans-serif"
      fill={COLORS.bubble}
      direction={isRTL ? 'rtl' : 'ltr'}
    >
      {text}
    </text>
  );

  return elements;
}

// ─── Main Component ───
export default function PanelPreview({ panel }) {
  if (!panel || (!panel.characters.length && !panel.bubbles.length && !panel.background)) {
    return null;
  }

  const { w, h } = getLayoutDims(panel.layout);
  const isCloseup = panel.layout === 'closeup';

  return (
    <div className="panel-preview">
      {/* Layout label */}
      <div className="panel-label">
        <span className="panel-layout-tag">{panel.layout.toUpperCase()}</span>
        {panel.background && (
          <span className="panel-bg-tag">BG: {panel.background}</span>
        )}
      </div>

      {/* SVG Panel */}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        width="100%"
        style={{ maxWidth: w, maxHeight: h * 1.2 }}
        className="panel-svg"
      >
        {/* Panel border */}
        <rect x="1" y="1" width={w - 2} height={h - 2} rx="4"
          fill={COLORS.bg} stroke={COLORS.border} strokeWidth="1.5" />

        {/* Background elements */}
        <g opacity="0.7">
          {renderBackground(panel.background, w, h)}
        </g>

        {/* Split panel divider */}
        {panel.layout === 'split' && (
          <line x1={w / 2} y1="4" x2={w / 2} y2={h - 4}
            stroke={COLORS.border} strokeWidth="1" strokeDasharray="4,3" />
        )}

        {/* Characters */}
        {panel.characters.map((char, i) =>
          renderCharacter(char, i, panel.characters.length, w, h, isCloseup)
        )}

        {/* Bubbles */}
        {panel.bubbles.map((bubble, i) =>
          renderBubble(bubble, i, w, h)
        )}

        {/* Layout indicator in corner */}
        <text x={w - 6} y={h - 6} textAnchor="end" fontSize="6"
          fontFamily="'IBM Plex Mono',monospace" fill={COLORS.label}>
          {panel.layout}
        </text>
      </svg>
    </div>
  );
}
