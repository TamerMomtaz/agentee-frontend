// src/utils/parseDirection.js
// Parses natural language scene directions into structured panel data
// Supports: panel layouts, character positions, speech/thought bubbles,
//           background hints, and bilingual (Arabic + English) content

// ─── Panel Layout Detection ───
const LAYOUT_PATTERNS = [
  { pattern: /\b(wide|panoramic|landscape|widescreen)\s*(panel|shot)?/i, layout: 'wide' },
  { pattern: /\b(tall|vertical|portrait)\s*(panel|shot)?/i, layout: 'tall' },
  { pattern: /\b(close[\s-]?up|closeup|zoom)\b/i, layout: 'closeup' },
  { pattern: /\b(establishing|estab|wide\s*establishing)\s*(shot)?/i, layout: 'establishing' },
  { pattern: /\b(split|dual|two[\s-]?panel|side[\s-]?by[\s-]?side)\b/i, layout: 'split' },
  { pattern: /\b(full[\s-]?page|splash|big)\b/i, layout: 'fullpage' },
  { pattern: /\b(small|inset|tiny)\s*(panel)?/i, layout: 'small' },
  { pattern: /\b(medium|mid[\s-]?shot|normal)\s*(panel|shot)?/i, layout: 'medium' },
  // Arabic layout hints
  { pattern: /لوحة\s*(واسعة|عريضة)/i, layout: 'wide' },
  { pattern: /لوحة\s*(طويلة|رأسية)/i, layout: 'tall' },
  { pattern: /لقطة\s*(قريبة|مقربة)/i, layout: 'closeup' },
  { pattern: /صفحة\s*كاملة/i, layout: 'fullpage' },
];

// ─── Background Detection ───
const BG_PATTERNS = [
  { pattern: /\b(city|cityscape|urban|buildings|skyscrapers?)\b/i, bg: 'city' },
  { pattern: /\b(ocean|sea|waves?|water|shore|beach)\b/i, bg: 'ocean' },
  { pattern: /\b(desert|sand|dunes?|sahara)\b/i, bg: 'desert' },
  { pattern: /\b(room|interior|inside|office|house|home)\b/i, bg: 'interior' },
  { pattern: /\b(sky|clouds?|sunset|sunrise|night\s*sky|stars?)\b/i, bg: 'sky' },
  { pattern: /\b(forest|trees?|woods?|jungle|garden)\b/i, bg: 'forest' },
  { pattern: /\b(mountain|hill|cliff|peak)\b/i, bg: 'mountain' },
  { pattern: /\b(street|road|alley|pathway|market|souk)\b/i, bg: 'street' },
  { pattern: /\b(factory|plant|industrial|machines?)\b/i, bg: 'factory' },
  { pattern: /\b(space|cosmos|galaxy|universe|void)\b/i, bg: 'space' },
  { pattern: /\b(abstract|swirl|pattern|geometric)\b/i, bg: 'abstract' },
  // Arabic backgrounds
  { pattern: /(مدينة|مباني|عمارات)/i, bg: 'city' },
  { pattern: /(بحر|موج|محيط|شاطئ)/i, bg: 'ocean' },
  { pattern: /(صحراء|رمل)/i, bg: 'desert' },
  { pattern: /(غرفة|مكتب|بيت|داخل)/i, bg: 'interior' },
  { pattern: /(سماء|سما|نجوم|غروب)/i, bg: 'sky' },
  { pattern: /(شارع|سوق|طريق|زقاق)/i, bg: 'street' },
  { pattern: /(مصنع|مكن)/i, bg: 'factory' },
  { pattern: /(فضاء|كون)/i, bg: 'space' },
];

// ─── Character Position Detection ───
const POSITION_PATTERNS = [
  { pattern: /\b(left|يسار)\b/i, pos: 'left' },
  { pattern: /\b(right|يمين)\b/i, pos: 'right' },
  { pattern: /\b(center|middle|وسط|نص)\b/i, pos: 'center' },
  { pattern: /\b(background|back|far|خلف|بعيد)\b/i, pos: 'background' },
  { pattern: /\b(foreground|front|close|قدام|قريب)\b/i, pos: 'foreground' },
];

// ─── Known Characters ───
const KNOWN_CHARS = ['kahotia', 'tee', 'كاهوتيا'];

// ─── Action/Pose Detection ───
const POSE_PATTERNS = [
  { pattern: /\b(stand(?:s|ing)?|واقف|واقفة)\b/i, pose: 'standing' },
  { pattern: /\b(sit(?:s|ting)?|قاعد|قاعدة)\b/i, pose: 'sitting' },
  { pattern: /\b(walk(?:s|ing)?|ماشي|ماشية)\b/i, pose: 'walking' },
  { pattern: /\b(run(?:s|ning)?|جري|بيجري)\b/i, pose: 'running' },
  { pattern: /\b(look(?:s|ing)?\s*(back|away|up|down)?|بيبص|بتبص)\b/i, pose: 'looking' },
  { pattern: /\b(point(?:s|ing)?|بيشاور)\b/i, pose: 'pointing' },
  { pattern: /\b(face(?:s|ing)?|مواجه)/i, pose: 'facing' },
  { pattern: /\b(turn(?:s|ing)?|ملتفت)/i, pose: 'turning' },
  { pattern: /\b(flying|fly|طاير)\b/i, pose: 'flying' },
];

// ─── Main Parser ───
export function parseDirection(text) {
  if (!text || typeof text !== 'string') {
    return { layout: 'medium', characters: [], bubbles: [], background: null, raw: text || '' };
  }

  const result = {
    layout: 'medium',
    characters: [],
    bubbles: [],
    background: null,
    mood: null,
    raw: text,
  };

  // 1. Detect layout
  for (const { pattern, layout } of LAYOUT_PATTERNS) {
    if (pattern.test(text)) {
      result.layout = layout;
      break;
    }
  }

  // 2. Detect background
  for (const { pattern, bg } of BG_PATTERNS) {
    if (pattern.test(text)) {
      result.background = bg;
      break;
    }
  }

  // 3. Extract speech/thought bubbles
  // Pattern: "Speech bubble: <text>" or "says: <text>" or quoted text
  const bubblePatterns = [
    // English patterns
    /(?:speech\s*bubble|says?|speaking|yelling|whisper(?:s|ing)?)\s*[:：]\s*["""]?(.+?)["""]?(?:\.|$)/gi,
    /(?:thought?\s*bubble|thinks?)\s*[:：]\s*["""]?(.+?)["""]?(?:\.|$)/gi,
    // Quoted text (likely dialogue)
    /["""]([^"""]+)["""]/g,
    // Arabic quoted text
    /[«»]([^«»]+)[«»]/g,
  ];

  const extractedBubbles = new Set();
  
  // Speech bubbles
  const speechRegex = /(?:speech\s*bubble|says?|speaking|yelling|whisper(?:s|ing)?)\s*[:：]\s*["""]?(.+?)["""]?(?:\.|,|$)/gi;
  let match;
  while ((match = speechRegex.exec(text)) !== null) {
    const bubbleText = match[1].trim();
    if (bubbleText && !extractedBubbles.has(bubbleText)) {
      extractedBubbles.add(bubbleText);
      result.bubbles.push({ type: 'speech', text: bubbleText, position: 'auto' });
    }
  }

  // Thought bubbles
  const thoughtRegex = /(?:thought?\s*bubble|thinks?)\s*[:：]\s*["""]?(.+?)["""]?(?:\.|,|$)/gi;
  while ((match = thoughtRegex.exec(text)) !== null) {
    const bubbleText = match[1].trim();
    if (bubbleText && !extractedBubbles.has(bubbleText)) {
      extractedBubbles.add(bubbleText);
      result.bubbles.push({ type: 'thought', text: bubbleText, position: 'auto' });
    }
  }

  // Quoted text as speech (if no explicit bubbles found)
  if (result.bubbles.length === 0) {
    const quoteRegex = /["""«]([^"""»]+)["""»]/g;
    while ((match = quoteRegex.exec(text)) !== null) {
      const bubbleText = match[1].trim();
      if (bubbleText.length > 1 && !extractedBubbles.has(bubbleText)) {
        extractedBubbles.add(bubbleText);
        result.bubbles.push({ type: 'speech', text: bubbleText, position: 'auto' });
      }
    }
  }

  // 4. Extract characters
  const lowerText = text.toLowerCase();
  const charSet = new Set();

  // Check known characters
  for (const name of KNOWN_CHARS) {
    if (lowerText.includes(name)) {
      charSet.add(name === 'كاهوتيا' ? 'Kahotia' : name.charAt(0).toUpperCase() + name.slice(1));
    }
  }

  // Look for "<Name> stands/sits/walks/looks" patterns
  const charActionRegex = /\b([A-Z][a-z]+)\s+(?:stand|sit|walk|run|look|point|face|turn|speak|hold|lean|crouch|kneel|fly)/g;
  while ((match = charActionRegex.exec(text)) !== null) {
    const name = match[1];
    // Filter out common non-character words
    if (!['The', 'She', 'He', 'They', 'Wide', 'Close', 'Full', 'Big', 'Small', 'Split'].includes(name)) {
      charSet.add(name);
    }
  }

  // Build character objects with position and pose
  const charNames = Array.from(charSet);
  const defaultPositions = ['left', 'right', 'center'];

  charNames.forEach((name, i) => {
    let position = defaultPositions[i] || 'center';
    let pose = 'standing';

    // Search for position near character name
    const nameIdx = lowerText.indexOf(name.toLowerCase());
    if (nameIdx >= 0) {
      // Look in a window around the character name
      const window = text.substring(Math.max(0, nameIdx - 30), Math.min(text.length, nameIdx + name.length + 60));
      for (const { pattern, pos } of POSITION_PATTERNS) {
        if (pattern.test(window)) { position = pos; break; }
      }
      for (const { pattern, pose: p } of POSE_PATTERNS) {
        if (pattern.test(window)) { pose = p; break; }
      }
    }

    result.characters.push({ name, position, pose });
  });

  // If no characters found but bubbles exist, add a generic character
  if (result.characters.length === 0 && result.bubbles.length > 0) {
    result.characters.push({ name: '?', position: 'center', pose: 'standing' });
  }

  // 5. Auto-position bubbles near characters
  result.bubbles.forEach((bubble, i) => {
    if (bubble.position === 'auto') {
      if (result.characters.length > 0) {
        const charIdx = Math.min(i, result.characters.length - 1);
        bubble.position = result.characters[charIdx].position === 'left' ? 'top-left' : 'top-right';
      } else {
        bubble.position = 'top-center';
      }
    }
  });

  return result;
}

// ─── Export for storyboard markdown ───
export function panelToMarkdown(panel) {
  const lines = [];
  lines.push(`**[${panel.layout.toUpperCase()} PANEL]**`);
  if (panel.background) lines.push(`Background: ${panel.background}`);
  panel.characters.forEach(c => {
    lines.push(`  ${c.name} — ${c.pose}, ${c.position}`);
  });
  panel.bubbles.forEach(b => {
    const icon = b.type === 'thought' ? '💭' : '💬';
    lines.push(`  ${icon} "${b.text}"`);
  });
  return lines.join('\n');
}
