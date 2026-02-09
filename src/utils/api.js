const API_BASE = 'https://agentee.up.railway.app';
const TIMEOUT_MS = 30000;

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(API_BASE + path, {
      ...options,
      signal: controller.signal,
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...options.headers,
      },
    });
    const data = await res.json();
    return { ok: res.ok, data };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, data: null, error: 'Request timed out' };
    }
    return { ok: false, data: null, error: err.message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function healthCheck() {
  return request('/api/v1/health');
}

export async function think(query, opts = {}) {
  const body = { query };
  if (opts.modelOverride) body.model_override = opts.modelOverride;
  return request('/api/v1/think', { method: 'POST', body: JSON.stringify(body) });
}

export async function thinkAudio(blob) {
  const fd = new FormData();
  fd.append('audio', blob, 'recording.webm');
  return request('/api/v1/think/audio', { method: 'POST', body: fd });
}

export async function saveIdea(idea) {
  return request('/api/v1/ideas', { method: 'POST', body: JSON.stringify({ idea }) });
}

export async function getIdeas() {
  return request('/api/v1/ideas');
}

export async function deleteIdea(id) {
  return request('/api/v1/ideas/' + id, { method: 'DELETE' });
}

export function voiceUrl(voiceId) {
  return API_BASE + '/api/v1/voice/' + voiceId;
}

export const ENGINE_META = {
  'claude':      { label: 'Sonnet',  color: '#CE93D8', icon: '🧠' },
  'claude-opus': { label: 'Opus',    color: '#F48FB1', icon: '👁️' },
  'gemini':      { label: 'Gemini',  color: '#80CBC4', icon: '💎' },
  'openai':      { label: 'OpenAI',  color: '#FFE082', icon: '⚡' },
  'error':       { label: 'Error',   color: '#EF9A9A', icon: '⚠️' },
};

export function getEngineMeta(engine) {
  return ENGINE_META[engine] || { label: engine, color: '#90CAF9', icon: '🌊' };
}
